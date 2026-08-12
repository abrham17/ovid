import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import { createNotification } from "@/lib/services/notification.service";

/** Only the Contractor PM tier may appoint oversight over a subcontract. */
const OVERSIGHT_ASSIGNERS = new Set(["SENIOR_PM", "DEPUTY_PM", "ADMIN"]);

/**
 * Roles that can carry an oversight assignment. This is not a new role — it is a
 * new *kind of assignment* several existing field roles can hold, layered on top
 * of their normal permissions (file 20 §5.4).
 */
export const OVERSIGHT_CAPABLE_ROLES = [
  "FOREMAN",
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "DEPUTY_PM",
  "SENIOR_PM",
] as const;

const OVERSIGHT_CAPABLE = new Set<string>(OVERSIGHT_CAPABLE_ROLES);

export async function listOversightAssignments(
  user: SessionUser,
  projectId: string,
  opts: { contractId?: string; includeEnded?: boolean } = {}
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "read");

  // A subcontractor may see that their branch is under oversight and by whom —
  // the relationship is not covert — but never oversight of other contracts.
  const contractFilter =
    user.partyType === "SUBCONTRACTOR"
      ? {
          contract: { contractorOrgId: user.organizationId },
        }
      : {};

  return db.oversightAssignment.findMany({
    where: {
      projectId,
      ...(opts.includeEnded ? {} : { endedAt: null }),
      ...(opts.contractId ? { contractId: opts.contractId } : {}),
      ...contractFilter,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true, jobTitle: true } },
      assignedBy: { select: { id: true, fullName: true } },
      contract: {
        select: {
          id: true,
          scopeDescription: true,
          contractorOrg: { select: { id: true, name: true } },
        },
      },
      scopeWbsNode: { select: { id: true, code: true, name: true } },
      _count: { select: { dailyEntries: true } },
    },
    orderBy: [{ assignedAt: "desc" }],
  });
}

/**
 * Appoint one of the contractor's own field staff to independently verify a
 * subcontractor's branch.
 *
 * Deliberately separate from SectionAssignment/ActivityAssignment: those say who
 * executes work, this says who checks it. The person checking a subcontractor's
 * work must not be modeled identically to the person doing it, for the same
 * segregation-of-duties reason QC sits outside the execution line
 * (file 18 §7.2, file 20 §5.4).
 */
export async function assignOversight(
  user: SessionUser,
  projectId: string,
  input: { userId: string; contractId: string }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "create");

  if (!OVERSIGHT_ASSIGNERS.has(user.role)) {
    throw new DomainError(
      "Only Senior or Deputy Project Managers may appoint oversight",
      403
    );
  }

  const contract = await db.contract.findFirst({
    where: { id: input.contractId, projectId },
    select: {
      id: true,
      contractorOrgId: true,
      scopeWbsNodeId: true,
      status: true,
      project: { select: { contractorOrgId: true } },
    },
  });
  if (!contract) throw new DomainError("Contract not found on this project", 404);
  if (contract.status !== "ACTIVE") {
    throw new DomainError(
      `Cannot appoint oversight over a ${contract.status.toLowerCase()} contract`,
      400
    );
  }
  if (!contract.scopeWbsNodeId) {
    throw new DomainError(
      "This contract has no WBS scope root — assign it a branch before appointing oversight",
      400
    );
  }

  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, organizationId: true, active: true, fullName: true },
  });
  if (!target) throw new DomainError("Target user not found", 404);
  if (!target.active) throw new DomainError("Target user is not active", 400);

  if (!OVERSIGHT_CAPABLE.has(target.role)) {
    throw new DomainError(
      `Oversight can only be held by ${OVERSIGHT_CAPABLE_ROLES.join(", ")}`,
      400
    );
  }

  // The watcher must belong to the watching organization, not the watched one.
  if (target.organizationId === contract.contractorOrgId) {
    throw new DomainError(
      "Oversight must be held by someone outside the subcontractor's own organization — otherwise it is self-verification",
      400
    );
  }
  if (target.organizationId !== contract.project.contractorOrgId) {
    throw new DomainError(
      "Oversight must be held by the main contractor's own staff",
      400
    );
  }

  const membership = await db.projectMembership.findFirst({
    where: { projectId, userId: input.userId },
    select: { id: true },
  });
  if (!membership) {
    throw new DomainError("Target user is not a member of this project", 400);
  }

  const existing = await db.oversightAssignment.findFirst({
    where: { projectId, userId: input.userId, contractId: contract.id, endedAt: null },
    select: { id: true },
  });
  if (existing) {
    throw new DomainError(
      "This person already holds active oversight over this contract",
      409
    );
  }

  const assignment = await db.oversightAssignment.create({
    data: {
      projectId,
      userId: input.userId,
      contractId: contract.id,
      scopeWbsNodeId: contract.scopeWbsNodeId,
      assignedById: user.id,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      contract: {
        select: {
          id: true,
          scopeDescription: true,
          contractorOrg: { select: { name: true } },
        },
      },
      scopeWbsNode: { select: { id: true, code: true, name: true } },
    },
  });

  await createNotification({
    userId: input.userId,
    projectId,
    type: "OVERSIGHT_ASSIGNED",
    entityType: "OversightAssignment",
    entityId: assignment.id,
    message: `You have been assigned oversight of ${assignment.contract.contractorOrg.name}'s scope: ${assignment.scopeWbsNode.name}`,
  });

  return assignment;
}

/**
 * End an oversight appointment. Never an overwrite — the record is closed with
 * an endedAt so "who was watching when the defect occurred" survives staff
 * turnover (file 18 §8, file 20 §5.4).
 */
export async function endOversight(user: SessionUser, assignmentId: string) {
  const assignment = await db.oversightAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, projectId: true, endedAt: true },
  });
  if (!assignment) throw new DomainError("Oversight assignment not found", 404);

  await assertProjectAccess(user, assignment.projectId);
  assertPermission(user, "assignment", "update");

  if (!OVERSIGHT_ASSIGNERS.has(user.role)) {
    throw new DomainError(
      "Only Senior or Deputy Project Managers may end an oversight appointment",
      403
    );
  }
  if (assignment.endedAt) {
    throw new DomainError("This oversight appointment has already ended", 400);
  }

  return db.oversightAssignment.update({
    where: { id: assignmentId },
    data: { endedAt: new Date() },
  });
}

/**
 * Replace the oversight holder over a contract, preserving history via the
 * supersede chain rather than mutating the old row.
 */
export async function reassignOversight(
  user: SessionUser,
  assignmentId: string,
  newUserId: string
) {
  const previous = await db.oversightAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, projectId: true, contractId: true, endedAt: true },
  });
  if (!previous) throw new DomainError("Oversight assignment not found", 404);
  if (previous.endedAt) {
    throw new DomainError("This oversight appointment has already ended", 400);
  }

  const replacement = await assignOversight(user, previous.projectId, {
    userId: newUserId,
    contractId: previous.contractId,
  });

  await db.oversightAssignment.update({
    where: { id: assignmentId },
    data: { endedAt: new Date(), supersededById: replacement.id },
  });

  return replacement;
}

export type { OversightContext } from "@/lib/scope/oversight-scope";
export { getOversightContext } from "@/lib/scope/oversight-scope";

/** Active oversight holders over a contract — the approval gate for its requests. */
export async function getOversightHolders(contractId: string) {
  return db.oversightAssignment.findMany({
    where: { contractId, endedAt: null },
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, fullName: true, role: true } },
    },
  });
}

/** Whether this user may act as the oversight gate for a contract. */
export async function hasOversightOver(
  userId: string,
  contractId: string
): Promise<boolean> {
  const found = await db.oversightAssignment.findFirst({
    where: { userId, contractId, endedAt: null },
    select: { id: true },
  });
  return Boolean(found);
}
