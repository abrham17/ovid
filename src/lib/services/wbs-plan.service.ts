import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import { getOrganizationScope, isAll } from "@/lib/scope";
import { validateWeightTree, type WeightViolation } from "@/lib/services/weight.service";
import { createNotification } from "@/lib/services/notification.service";
import type { WbsPlanSubmissionStatus } from "@/generated/prisma/enums";

/** Contractor PM tier — the only reviewers of a subcontractor's plan. */
const PLAN_REVIEWERS = new Set(["SENIOR_PM", "DEPUTY_PM", "ADMIN"]);
/** Roles that may author a decomposition plan for a contract they hold. */
const PLAN_AUTHORS = new Set(["SUBCONTRACTOR_PM", "SENIOR_PM", "DEPUTY_PM", "ADMIN"]);

const EDITABLE_STATUSES: WbsPlanSubmissionStatus[] = [
  "DRAFT",
  "REVISION_REQUESTED",
  "REJECTED",
];

/**
 * The contracts whose plan submissions this user may see.
 * Returns null for "no restriction" (contractor PM tier sees every plan).
 */
async function visibleContractIds(
  user: SessionUser,
  projectId: string
): Promise<string[] | null> {
  if (user.partyType !== "SUBCONTRACTOR") return null;

  const contracts = await db.contract.findMany({
    where: { projectId, contractorOrgId: user.organizationId },
    select: { id: true },
  });
  return contracts.map((c) => c.id);
}

async function loadSubmissionForUser(user: SessionUser, submissionId: string) {
  const submission = await db.wbsPlanSubmission.findUnique({
    where: { id: submissionId },
    include: {
      contract: {
        select: {
          id: true,
          contractorOrgId: true,
          scopeWbsNodeId: true,
          status: true,
        },
      },
      rootWbsNode: { select: { id: true, code: true, name: true } },
    },
  });
  if (!submission) throw new DomainError("Plan submission not found", 404);

  await assertProjectAccess(user, submission.projectId);

  const allowed = await visibleContractIds(user, submission.projectId);
  if (allowed !== null && !allowed.includes(submission.contractId)) {
    // A subcontractor must never learn that another subcontractor's plan exists.
    throw new DomainError("Plan submission not found", 404);
  }
  return submission;
}

export async function listPlanSubmissions(
  user: SessionUser,
  projectId: string,
  opts: { status?: WbsPlanSubmissionStatus } = {}
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "read");

  const allowed = await visibleContractIds(user, projectId);

  return db.wbsPlanSubmission.findMany({
    where: {
      projectId,
      ...(allowed === null ? {} : { contractId: { in: allowed } }),
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: {
      contract: {
        select: {
          id: true,
          scopeDescription: true,
          contractorOrg: { select: { id: true, name: true } },
        },
      },
      rootWbsNode: { select: { id: true, code: true, name: true } },
      createdBy: { select: { id: true, fullName: true } },
      submittedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
      _count: { select: { nodes: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

/** One submission with its full proposed node tree, for the PM's review view. */
export async function getPlanSubmission(user: SessionUser, submissionId: string) {
  const submission = await loadSubmissionForUser(user, submissionId);
  assertPermission(user, "wbs", "read");

  const nodes = await db.wbsNode.findMany({
    where: { planSubmissionId: submissionId },
    select: {
      id: true,
      parentId: true,
      code: true,
      name: true,
      nodeType: true,
      status: true,
      weightPercent: true,
      plannedStartDate: true,
      plannedEndDate: true,
      _count: { select: { activities: true } },
    },
    orderBy: [{ code: "asc" }],
  });

  const violations = await validateWeightTree(submission.rootWbsNodeId, {
    includeDraft: true,
  });

  return { ...submission, nodes, violations };
}

export async function createPlanSubmission(
  user: SessionUser,
  projectId: string,
  input: { contractId: string; title: string }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "create");

  if (!PLAN_AUTHORS.has(user.role)) {
    throw new DomainError("Your role may not author a WBS plan submission", 403);
  }

  const contract = await db.contract.findFirst({
    where: { id: input.contractId, projectId },
    select: {
      id: true,
      contractorOrgId: true,
      scopeWbsNodeId: true,
      status: true,
    },
  });
  if (!contract) throw new DomainError("Contract not found on this project", 404);

  if (contract.status !== "ACTIVE") {
    throw new DomainError(
      `Cannot plan against a ${contract.status.toLowerCase()} contract`,
      400
    );
  }
  if (!contract.scopeWbsNodeId) {
    throw new DomainError(
      "This contract has no WBS scope root yet — the Contractor PM must assign a branch first",
      400
    );
  }
  if (
    user.partyType === "SUBCONTRACTOR" &&
    contract.contractorOrgId !== user.organizationId
  ) {
    throw new DomainError("This contract belongs to another organization", 403);
  }

  const openSubmission = await db.wbsPlanSubmission.findFirst({
    where: {
      contractId: contract.id,
      status: { in: ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"] },
    },
    select: { id: true, status: true },
  });
  if (openSubmission) {
    throw new DomainError(
      `This contract already has an open plan submission (${openSubmission.status}) — finish or withdraw it first`,
      409
    );
  }

  return db.wbsPlanSubmission.create({
    data: {
      projectId,
      contractId: contract.id,
      rootWbsNodeId: contract.scopeWbsNodeId,
      title: input.title,
      status: "DRAFT",
      createdById: user.id,
    },
    include: {
      rootWbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

export type PlanValidationResult = {
  ok: boolean;
  violations: WeightViolation[];
  nodeCount: number;
};

/**
 * Run the submission gate without submitting — lets the subcontractor see
 * exactly which node is short before they hand the plan over.
 */
export async function validatePlanSubmission(
  user: SessionUser,
  submissionId: string
): Promise<PlanValidationResult> {
  const submission = await loadSubmissionForUser(user, submissionId);
  assertPermission(user, "wbs", "read");

  const [violations, nodeCount] = await Promise.all([
    validateWeightTree(submission.rootWbsNodeId, { includeDraft: true }),
    db.wbsNode.count({ where: { planSubmissionId: submissionId } }),
  ]);

  return { ok: violations.length === 0 && nodeCount > 0, violations, nodeCount };
}

/**
 * Hand the plan to the Contractor PM.
 *
 * Blocks on the recursive 100%-Rule check rather than accepting an invalid plan
 * and discovering the rollup is wrong later — this is the point where partial
 * decomposition is most likely to slip through (file 20 §3.2).
 */
export async function submitPlan(user: SessionUser, submissionId: string) {
  const submission = await loadSubmissionForUser(user, submissionId);
  assertPermission(user, "wbs", "update");

  if (!PLAN_AUTHORS.has(user.role)) {
    throw new DomainError("Your role may not submit a WBS plan", 403);
  }
  if (!EDITABLE_STATUSES.includes(submission.status)) {
    throw new DomainError(
      `A ${submission.status} plan cannot be submitted`,
      400
    );
  }

  const nodeCount = await db.wbsNode.count({
    where: { planSubmissionId: submissionId },
  });
  if (nodeCount === 0) {
    throw new DomainError(
      "This plan contains no nodes yet — decompose the branch before submitting",
      400
    );
  }

  const violations = await validateWeightTree(submission.rootWbsNodeId, {
    includeDraft: true,
  });
  if (violations.length > 0) {
    const shown = violations.slice(0, 5).map((v) => v.message);
    const extra =
      violations.length > shown.length
        ? ` (and ${violations.length - shown.length} more)`
        : "";
    throw new DomainError(
      `Plan does not satisfy the 100% Rule: ${shown.join("; ")}${extra}`,
      400
    );
  }

  const updated = await db.wbsPlanSubmission.update({
    where: { id: submissionId },
    data: {
      status: "SUBMITTED",
      submittedById: user.id,
      submittedAt: new Date(),
      validationSummary: {
        checkedAt: new Date().toISOString(),
        nodeCount,
        violations: [],
      },
    },
  });

  await notifyPlanReviewers(submission.projectId, submissionId, user.id);
  return updated;
}

async function notifyPlanReviewers(
  projectId: string,
  submissionId: string,
  excludeUserId: string
) {
  const reviewers = await db.user.findMany({
    where: {
      role: { in: ["SENIOR_PM", "DEPUTY_PM"] },
      active: true,
      id: { not: excludeUserId },
      memberships: { some: { projectId } },
    },
    select: { id: true },
  });

  for (const reviewer of reviewers) {
    await createNotification({
      userId: reviewer.id,
      projectId,
      type: "WBS_PLAN_PENDING_REVIEW",
      entityType: "WbsPlanSubmission",
      entityId: submissionId,
      message: "A subcontractor's WBS plan is awaiting your review",
    });
  }
}

export type PlanDecision = "APPROVE" | "REQUEST_REVISION" | "REJECT";

/**
 * Contractor PM decision on a submitted plan.
 *
 * Approving flips every DRAFT node in the submission to ACTIVE in one
 * transaction, so the branch joins the live rollup and unlocks
 * Schedule/Daily/Quality atomically — never half-live.
 */
export async function reviewPlan(
  user: SessionUser,
  submissionId: string,
  decision: PlanDecision,
  comments?: string
) {
  const submission = await loadSubmissionForUser(user, submissionId);
  assertPermission(user, "wbs", "update");

  if (!PLAN_REVIEWERS.has(user.role)) {
    throw new DomainError(
      "Only Senior or Deputy Project Managers may review a WBS plan",
      403
    );
  }
  if (user.partyType === "SUBCONTRACTOR") {
    throw new DomainError(
      "A subcontractor cannot review their own plan submission",
      403
    );
  }
  if (submission.status !== "SUBMITTED") {
    throw new DomainError(
      `Only a SUBMITTED plan can be reviewed (this one is ${submission.status})`,
      400
    );
  }
  if (decision !== "APPROVE" && !comments?.trim()) {
    throw new DomainError(
      "Explain what needs to change when requesting revision or rejecting",
      400
    );
  }

  const now = new Date();

  if (decision === "APPROVE") {
    // Re-validate at approval time: nodes elsewhere in the branch may have
    // changed while the plan sat in the queue.
    const violations = await validateWeightTree(submission.rootWbsNodeId, {
      includeDraft: true,
    });
    if (violations.length > 0) {
      throw new DomainError(
        `Plan no longer satisfies the 100% Rule and cannot be approved: ${violations
          .slice(0, 3)
          .map((v) => v.message)
          .join("; ")}`,
        409
      );
    }

    const [, updated] = await db.$transaction([
      db.wbsNode.updateMany({
        where: { planSubmissionId: submissionId, status: "DRAFT" },
        data: { status: "ACTIVE" },
      }),
      db.wbsPlanSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          reviewedById: user.id,
          reviewedAt: now,
          reviewComments: comments ?? null,
        },
      }),
    ]);

    await notifyPlanAuthor(submission, submissionId, "approved");
    return updated;
  }

  const status: WbsPlanSubmissionStatus =
    decision === "REJECT" ? "REJECTED" : "REVISION_REQUESTED";

  const updated = await db.wbsPlanSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: now,
      reviewComments: comments ?? null,
    },
  });

  await notifyPlanAuthor(
    submission,
    submissionId,
    decision === "REJECT" ? "rejected" : "returned for revision"
  );
  return updated;
}

async function notifyPlanAuthor(
  submission: { projectId: string; createdById: string; submittedById: string | null },
  submissionId: string,
  outcome: string
) {
  const recipients = new Set(
    [submission.submittedById, submission.createdById].filter(
      (id): id is string => Boolean(id)
    )
  );
  for (const userId of recipients) {
    await createNotification({
      userId,
      projectId: submission.projectId,
      type: "WBS_PLAN_REVIEWED",
      entityType: "WbsPlanSubmission",
      entityId: submissionId,
      message: `Your WBS plan submission was ${outcome}`,
    });
  }
}

/**
 * Withdraw an open submission. DRAFT nodes it created are deleted along with it —
 * they were never authoritative, so leaving them orphaned as permanent DRAFTs
 * would clutter the tree with scope nobody owns.
 */
export async function withdrawPlan(user: SessionUser, submissionId: string) {
  const submission = await loadSubmissionForUser(user, submissionId);
  assertPermission(user, "wbs", "update");

  if (submission.status === "APPROVED") {
    throw new DomainError(
      "An approved plan is live and cannot be withdrawn — supersede it with a new submission instead",
      400
    );
  }
  if (
    user.partyType === "SUBCONTRACTOR" &&
    submission.createdById !== user.id &&
    submission.submittedById !== user.id
  ) {
    throw new DomainError("You did not author this plan submission", 403);
  }

  return db.$transaction(async (tx) => {
    // Deepest-first so a parent is never deleted before its children.
    const drafts = await tx.wbsNode.findMany({
      where: { planSubmissionId: submissionId, status: "DRAFT" },
      select: { id: true, code: true },
      orderBy: { code: "desc" },
    });
    for (const node of drafts) {
      await tx.wbsNode.delete({ where: { id: node.id } });
    }
    return tx.wbsPlanSubmission.update({
      where: { id: submissionId },
      data: { status: "REJECTED", reviewComments: "Withdrawn by author" },
    });
  });
}

/** Whether a WBS subtree is live enough to accept daily reporting / progress. */
export async function assertNodeIsLive(wbsNodeId: string) {
  const node = await db.wbsNode.findUnique({
    where: { id: wbsNodeId },
    select: { status: true, name: true },
  });
  if (!node) throw new DomainError("WBS node not found", 404);
  if (node.status === "DRAFT") {
    throw new DomainError(
      `"${node.name}" is part of an unapproved plan — it cannot carry progress or daily reports until the Contractor PM approves it`,
      409
    );
  }
  if (node.status === "ARCHIVED") {
    throw new DomainError(`"${node.name}" is archived`, 409);
  }
}

/** Contract scope roots a subcontractor party holds, for plan-authoring UIs. */
export async function listPlannableContracts(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "read");

  const org = await getOrganizationScope(user, projectId);

  return db.contract.findMany({
    where: {
      projectId,
      status: "ACTIVE",
      scopeWbsNodeId: { not: null },
      ...(user.partyType === "SUBCONTRACTOR"
        ? { contractorOrgId: user.organizationId }
        : {}),
      ...(isAll(org.visibleWbsNodeIds)
        ? {}
        : { scopeWbsNodeId: { in: [...org.visibleWbsNodeIds] } }),
    },
    select: {
      id: true,
      scopeDescription: true,
      contractorOrg: { select: { id: true, name: true } },
      scopeWbsNode: { select: { id: true, code: true, name: true } },
      planSubmissions: {
        select: { id: true, status: true, title: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
