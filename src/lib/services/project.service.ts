import crypto from "crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess, assertCapability } from "@/lib/permissions";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateWbsNodeInput,
} from "@/lib/validations/project";
import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain-rules";
import {
  getEffectiveScope,
  assertScopeWritable,
  isAll,
  isWbsVisible,
} from "@/lib/scope";
import { recordAuditLog } from "@/lib/services/audit";

export function computeSnapshotHash(snapshot: any): string {
  const jsonStr = JSON.stringify(snapshot);
  return crypto.createHash("sha256").update(jsonStr).digest("hex");
}

export async function listProjects(
  user: SessionUser,
  opts?: { status?: string; search?: string }
) {
  if (!user.companyRoles?.length) assertPermission(user, "project", "read");

  const where: Prisma.ProjectWhereInput = {
    OR: [
      { contractorOrgId: user.organizationId },
      { clientOrgId: user.organizationId },
      { consultantOrgId: user.organizationId },
      { memberships: { some: { userId: user.id } } },
    ],
  };

  if (opts?.status) where.status = opts.status as any;
  if (opts?.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: opts.search, mode: "insensitive" } },
          { code: { contains: opts.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return db.project.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      contractorOrg: { select: { id: true, name: true } },
      clientOrg: { select: { id: true, name: true } },
      _count: { select: { memberships: true, wbsNodes: true } },
    },
  });
}

export async function getProject(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "read");

  const scope = await getEffectiveScope(user, projectId);
  const visibleIds = isAll(scope.visibleWbsNodeIds)
    ? null
    : [...scope.visibleWbsNodeIds];
  const wbsIdIn = visibleIds ? { id: { in: visibleIds } } : undefined;
  const wbsNodeIdIn = visibleIds ? { wbsNodeId: { in: visibleIds } } : {};

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      contractorOrg: { select: { id: true, name: true, partyType: true, contractorGrade: true } },
      clientOrg: { select: { id: true, name: true, partyType: true } },
      consultantOrg: { select: { id: true, name: true, partyType: true } },
      contracts: true,
      memberships: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          organization: { select: { id: true, name: true, partyType: true } },
        },
      },
      objectives: true,
      baselines: {
        orderBy: { version: "desc" },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
      },
    },
  });

  const [
    wbsNodesCount,
    stoppagesCount,
    variationsCount,
    risksCount,
    earthworkCount,
    scheduleActivitiesCount,
    defectLogsCount,
    safetyIncidentsCount,
  ] = await Promise.all([
    db.wbsNode.count({
      where: { projectId, ...(wbsIdIn ? wbsIdIn : {}) },
    }),
    db.stoppageEntry.count({
      where: {
        projectId,
        ...(visibleIds
          ? {
              OR: [
                { wbsNodeId: null },
                { wbsNodeId: { in: visibleIds } },
              ],
            }
          : {}),
      },
    }),
    db.variationOrder.count({
      where: {
        projectId,
        ...(visibleIds
          ? {
              OR: [
                { wbsNodeId: null },
                { wbsNodeId: { in: visibleIds } },
              ],
            }
          : {}),
      },
    }),
    db.riskEntry.count({
      where: {
        projectId,
        ...(visibleIds
          ? {
              OR: [
                { wbsNodeId: null },
                { wbsNodeId: { in: visibleIds } },
              ],
            }
          : {}),
      },
    }),
    db.earthworkDailyEntry.count({
      where: { projectId, ...wbsNodeIdIn },
    }),
    db.scheduleActivity.count({
      where: { wbsNode: { projectId, ...(wbsIdIn ?? {}) } },
    }),
    db.defectLog.count({
      where: { wbsNode: { projectId, ...(wbsIdIn ?? {}) } },
    }),
    db.safetyIncident.count({
      where: { wbsNode: { projectId, ...(wbsIdIn ?? {}) } },
    }),
  ]);

  return {
    ...project,
    contractValue: scope.canViewCostDetail ? project.contractValue : null,
    _count: {
      memberships: project.memberships.length,
      wbsNodes: wbsNodesCount,
      stoppages: stoppagesCount,
      variations: variationsCount,
      risks: risksCount,
      earthworkDailyEntries: earthworkCount,
      scheduleActivities: scheduleActivitiesCount,
      defectLogs: defectLogsCount,
      safetyIncidents: safetyIncidentsCount,
    },
  };
}

export async function createProject(user: SessionUser, input: CreateProjectInput) {
  void user; void input;
  throw new DomainError("Projects must be created from a won tender approved by the General Manager", 409);
}

export async function addProjectObjective(
  user: SessionUser,
  projectId: string,
  input: { description: string; metric: string; targetValue: number; targetDate: string }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  const objective = await db.projectObjective.create({
    data: {
      projectId,
      description: input.description,
      metric: input.metric,
      targetValue: new Prisma.Decimal(input.targetValue),
      targetDate: new Date(input.targetDate),
      createdById: user.id,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "ProjectObjective",
    entityId: objective.id,
    action: "CREATE",
    after: objective,
  });

  return objective;
}

export async function createInitialBaseline(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "create");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      wbsNodes: {
        include: { activities: true, boqItems: true },
      },
      contracts: true,
    },
  });

  const latestBaseline = await db.projectBaseline.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  const version = (latestBaseline?.version ?? 0) + 1;
  const snapshotObj = JSON.parse(JSON.stringify(project));
  const snapshotHash = computeSnapshotHash(snapshotObj);

  const baseline = await db.projectBaseline.create({
    data: {
      projectId,
      version,
      type: "INTEGRATED",
      status: "DRAFT",
      snapshot: snapshotObj,
      hash: snapshotHash,
      schemaVersion: "1.0",
      createdById: user.id,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "ProjectBaseline",
    entityId: baseline.id,
    action: "CREATE",
    after: baseline,
    reason: "Created baseline draft",
    authority: user.role,
  });

  return baseline;
}

export async function submitBaseline(user: SessionUser, projectId: string, baselineId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  const baseline = await db.projectBaseline.findFirst({
    where: { id: baselineId, projectId },
  });
  if (!baseline) throw new DomainError("Baseline snapshot not found", 404);
  if (baseline.status !== "DRAFT") {
    throw new DomainError("Only DRAFT baselines can be submitted for approval", 400);
  }

  const updated = await db.projectBaseline.update({
    where: { id: baselineId },
    data: {
      status: "SUBMITTED",
      submittedById: user.id,
      submittedAt: new Date(),
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "ProjectBaseline",
    entityId: baselineId,
    action: "UPDATE",
    before: { status: baseline.status },
    after: { status: updated.status },
    reason: "Submitted baseline for independent approval",
    authority: user.role,
  });

  return updated;
}

export async function approveBaseline(
  user: SessionUser,
  projectId: string,
  baselineId: string,
  approvalComment?: string
) {
  await assertProjectAccess(user, projectId);
  assertCapability(user, "project", "approve");

  const baseline = await db.projectBaseline.findFirst({
    where: { id: baselineId, projectId },
  });
  if (!baseline) throw new DomainError("Baseline snapshot not found", 404);

  // F-004 Segregation of Duties: Author or submitter cannot self-approve
  if (baseline.createdById === user.id || baseline.submittedById === user.id) {
    throw new DomainError("Author or submitter cannot self-approve a project baseline (ISO 21502 SoD rule)", 403);
  }

  if (baseline.status !== "SUBMITTED" && baseline.status !== "DRAFT") {
    throw new DomainError("Baseline must be submitted prior to approval", 400);
  }

  const now = new Date();
  const updated = await db.projectBaseline.update({
    where: { id: baselineId },
    data: {
      status: "APPROVED",
      approvedById: user.id,
      approvedAt: now,
      approvalComment: approvalComment ?? "Approved per project governance review",
      lockedAt: now,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "ProjectBaseline",
    entityId: baselineId,
    action: "APPROVE",
    before: { status: baseline.status },
    after: { status: updated.status, approvedById: user.id },
    reason: approvalComment ?? "Approved project baseline",
    authority: user.role,
  });

  return updated;
}

export async function rejectBaseline(
  user: SessionUser,
  projectId: string,
  baselineId: string,
  rejectionReason: string
) {
  await assertProjectAccess(user, projectId);
  assertCapability(user, "project", "approve");

  const baseline = await db.projectBaseline.findFirst({
    where: { id: baselineId, projectId },
  });
  if (!baseline) throw new DomainError("Baseline snapshot not found", 404);

  const updated = await db.projectBaseline.update({
    where: { id: baselineId },
    data: {
      status: "REJECTED",
      approvalComment: rejectionReason,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "ProjectBaseline",
    entityId: baselineId,
    action: "REJECT",
    before: { status: baseline.status },
    after: { status: updated.status },
    reason: rejectionReason,
    authority: user.role,
  });

  return updated;
}

export async function transitionProjectStatus(
  user: SessionUser,
  projectId: string,
  targetStatus: "PLANNING" | "ACTIVE" | "SUSPENDED" | "COMPLETE" | "CLOSED",
  reason: string
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  // Legal transitions machine
  const validTransitions: Record<string, string[]> = {
    PLANNING: ["ACTIVE"],
    ACTIVE: ["SUSPENDED", "COMPLETE"],
    SUSPENDED: ["ACTIVE"],
    COMPLETE: ["CLOSED"],
    CLOSED: [],
  };

  const allowedNext = validTransitions[project.status] ?? [];
  if (!allowedNext.includes(targetStatus)) {
    throw new DomainError(`Cannot transition project status from ${project.status} to ${targetStatus}`, 422);
  }

  if (targetStatus === "ACTIVE") {
    const approvedBaselinesCount = await db.projectBaseline.count({
      where: { projectId, status: "APPROVED" },
    });
    if (approvedBaselinesCount === 0) {
      throw new DomainError("Project cannot transition to ACTIVE without an independently APPROVED baseline snapshot (ISO 21502)", 422);
    }
  }

  if (targetStatus === "COMPLETE" || targetStatus === "CLOSED") {
    const openDefects = await db.defectLog.count({
      where: {
        wbsNode: { projectId },
        status: { in: ["OPEN", "REWORK_IN_PROGRESS"] },
      },
    });
    if (openDefects > 0) {
      throw new DomainError(`Cannot transition to ${targetStatus} while ${openDefects} open defects exist on project WBS`, 422);
    }
  }

  const updatedProject = await db.project.update({
    where: { id: projectId },
    data: { status: targetStatus },
  });

  await db.projectStatusHistory.create({
    data: {
      projectId,
      fromStatus: project.status,
      toStatus: targetStatus,
      reason,
      changedById: user.id,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entityType: "Project",
    entityId: projectId,
    action: "UPDATE",
    before: { status: project.status },
    after: { status: targetStatus },
    reason,
    authority: user.role,
  });

  return updatedProject;
}

export async function updateProject(
  user: SessionUser,
  projectId: string,
  input: UpdateProjectInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  // F-005: Generic PATCH cannot directly mutate project status; status must go through transitionProjectStatus
  return db.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      code: input.code,
      projectType: input.projectType,
      contractType: input.contractType,
      contractValue:
        input.contractValue != null
          ? new Prisma.Decimal(input.contractValue)
          : undefined,
      plannedStartDate: input.plannedStartDate
        ? new Date(input.plannedStartDate)
        : undefined,
      plannedEndDate: input.plannedEndDate
        ? new Date(input.plannedEndDate)
        : undefined,
      clientOrgId: input.clientOrgId,
      consultantOrgId: input.consultantOrgId,
    },
  });
}


// ─── WBS ───────────────────────────────────────────────────────────

export async function getWbsTree(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "read");

  const scope = await getEffectiveScope(user, projectId);

  const readSet =
    scope.scheduleReadMode === "org_ceiling"
      ? scope.orgVisibleWbsNodeIds
      : scope.visibleWbsNodeIds;

  const nodes = await db.wbsNode.findMany({
    where: {
      projectId,
      ...(isAll(readSet) ? {} : { id: { in: [...readSet] } }),
    },
    orderBy: [{ code: "asc" }],
  });

  type Node = (typeof nodes)[0] & { children: Node[]; canWrite: boolean };
  const map = new Map<string, Node>();
  nodes.forEach((n) =>
    map.set(n.id, {
      ...n,
      children: [],
      canWrite: isWbsVisible(scope.writableWbsNodeIds, n.id),
    })
  );
  const roots: Node[] = [];
  for (const n of map.values()) {
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  return roots;
}

export async function createWbsNode(user: SessionUser, projectId: string, input: CreateWbsNodeInput) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "create");

  const scope = await getEffectiveScope(user, projectId);
  if (input.parentId) {
    const parent = await db.wbsNode.findFirst({
      where: { id: input.parentId, projectId },
    });
    if (!parent) throw new Error("Parent WBS node not found on this project");
    assertScopeWritable(scope, input.parentId);
  } else {
    if (!isAll(scope.writableWbsNodeIds)) {
      throw new Error("You cannot create a root WBS node outside your writable scope");
    }
  }

  const codeClash = await db.wbsNode.findFirst({
    where: { projectId, code: input.code },
  });
  if (codeClash) throw new Error(`WBS code "${input.code}" already exists on this project`);

  let status: "DRAFT" | "ACTIVE" = "ACTIVE";
  if (input.planSubmissionId) {
    const submission = await db.wbsPlanSubmission.findFirst({
      where: { id: input.planSubmissionId, projectId },
      select: { id: true, status: true, createdById: true, contractId: true },
    });
    if (!submission) {
      throw new Error("Plan submission not found on this project");
    }
    if (submission.status === "APPROVED") {
      throw new Error(
        "This plan submission is already approved — create a new submission for further detail"
      );
    }
    if (submission.status === "SUBMITTED") {
      throw new Error(
        "This plan submission is under review — wait for the outcome before editing it"
      );
    }
    status = "DRAFT";
  }

  return db.wbsNode.create({
    data: {
      projectId,
      parentId: input.parentId ?? null,
      name: input.name,
      code: input.code,
      nodeType: input.nodeType,
      designReady: input.designReady ?? false,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      weightPercent: input.weightPercent ?? null,
      planSubmissionId: input.planSubmissionId ?? null,
      status,
    },
  });
}

export async function updateWbsNode(
  user: SessionUser,
  projectId: string,
  nodeId: string,
  input: import("@/lib/validations/project").UpdateWbsNodeInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "update");

  const node = await db.wbsNode.findFirst({ where: { id: nodeId, projectId } });
  if (!node) throw new Error("WBS node not found");

  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, nodeId);

  if (input.parentId) {
    if (input.parentId === nodeId) {
      throw new Error("A WBS node cannot be its own parent");
    }
    const parent = await db.wbsNode.findFirst({
      where: { id: input.parentId, projectId },
    });
    if (!parent) throw new Error("Parent WBS node not found on this project");

    let cursor: string | null = input.parentId;
    const guard = new Set<string>();
    while (cursor) {
      if (cursor === nodeId) {
        throw new Error("That parent would create a cycle in the WBS tree");
      }
      if (guard.has(cursor)) break;
      guard.add(cursor);
      const row = await db.wbsNode.findFirst({
        where: { id: cursor, projectId },
        select: { parentId: true },
      }) as { parentId: string | null } | null;
      cursor = row?.parentId ?? null;
    }
  }

  if (input.code && input.code !== node.code) {
    const codeClash = await db.wbsNode.findFirst({
      where: { projectId, code: input.code, NOT: { id: nodeId } },
    });
    if (codeClash) throw new Error(`WBS code "${input.code}" already exists on this project`);
  }

  return db.wbsNode.update({
    where: { id: nodeId },
    data: {
      name: input.name,
      code: input.code,
      nodeType: input.nodeType,
      parentId: input.parentId === undefined ? undefined : input.parentId,
      designReady: input.designReady,
      weightPercent:
        input.weightPercent === undefined ? undefined : input.weightPercent,
    },
  });
}

export async function toggleDesignReady(
  user: SessionUser,
  projectId: string,
  nodeId: string,
  designReady: boolean
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "update");

  const node = await db.wbsNode.findFirst({ where: { id: nodeId, projectId } });
  if (!node) throw new Error("WBS node not found");

  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, nodeId);

  return db.wbsNode.update({
    where: { id: nodeId },
    data: { designReady },
  });
}

export async function deleteWbsNode(user: SessionUser, projectId: string, nodeId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "delete");

  const node = await db.wbsNode.findFirst({
    where: { id: nodeId, projectId },
    include: { _count: { select: { children: true, activities: true } } },
  });
  if (!node) throw new Error("WBS node not found");

  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, nodeId);
  if (node._count.children > 0) {
    throw new Error("Cannot delete a node that still has children — remove children first");
  }
  if (node._count.activities > 0) {
    throw new Error("Cannot delete a node that still has schedule activities — reassign or remove them first");
  }

  return db.wbsNode.delete({ where: { id: nodeId } });
}
