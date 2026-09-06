import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateActivityInput,
  UpdateActivityInput,
  CreateDependencyInput,
} from "@/lib/validations/schedule";
import { Prisma } from "@/generated/prisma/client";
import {
  DomainError,
  assertDateOrder,
  assertProgressPercent,
  assertStatusTransition,
  ACTIVITY_STATUS_TRANSITIONS,
  wouldCreateCycle,
} from "@/lib/domain-rules";
import type { DependencyType } from "@/generated/prisma/enums";
import {
  getEffectiveScope,
  assertScopeWritable,
  expandForemanScheduleActivityIds,
  activityWbsFilter,
} from "@/lib/scope";

// ── Existing Schedule Service Functions ──────────────────────────────

export async function listActivities(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "schedule", "read");

  const scope = await getEffectiveScope(user, projectId);

  // DRAFT nodes belong to an unapproved plan submission — their activities are
  // not yet part of the live schedule (file 20 §3.2).
  const liveNode = { projectId, status: { not: "DRAFT" as const } };

  let where: Prisma.ScheduleActivityWhereInput = { wbsNode: liveNode };

  if (scope.scheduleReadMode === "org_ceiling") {
    const orgFilter = activityWbsFilter(scope.orgVisibleWbsNodeIds);
    where = { wbsNode: liveNode, ...orgFilter };
  } else if (scope.scheduleReadMode === "assignment_plus_deps") {
    const ids = await expandForemanScheduleActivityIds(scope);
    where = { wbsNode: liveNode, id: { in: [...ids] } };
  } else {
    const vis = activityWbsFilter(scope.visibleWbsNodeIds);
    where = { wbsNode: liveNode, ...vis };
  }

  const activities = await db.scheduleActivity.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      predecessors: { select: { predecessorId: true } },
      stoppages: {
        select: {
          id: true,
          stoppageType: true,
          reason: true,
          startTime: true,
          endTime: true,
          responsibleParty: true,
        },
      },
      _count: { select: { stoppages: true } },
    },
  });

  const cpmInput = activities.map((a) => {
    const start = new Date(a.plannedStart).getTime();
    const finish = new Date(a.plannedFinish).getTime();
    const durationDays = Math.max(1, Math.ceil((finish - start) / (1000 * 60 * 60 * 24)));
    return {
      id: a.id,
      durationDays,
      predecessorIds: a.predecessors.map((p) => p.predecessorId),
    };
  });

  const { solveCriticalPath } = await import("@/lib/cpm-solver");
  const cpmResults = solveCriticalPath(cpmInput);

  return activities.map((a) => {
    const cpm = cpmResults.get(a.id);
    return {
      ...a,
      earlyStartDays: cpm?.earlyStart ?? 0,
      earlyFinishDays: cpm?.earlyFinish ?? 0,
      lateStartDays: cpm?.lateStart ?? 0,
      lateFinishDays: cpm?.lateFinish ?? 0,
      totalFloatDays: cpm?.totalFloat ?? 0,
      freeFloatDays: cpm?.freeFloat ?? 0,
      isCritical: cpm?.isCritical ?? false,
    };
  });
}

export async function createActivity(
  user: SessionUser,
  projectId: string,
  input: CreateActivityInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "schedule", "create");

  assertDateOrder(input.plannedStart, input.plannedFinish);

  const wbsNode = await db.wbsNode.findUnique({
    where: { id: input.wbsNodeId },
    select: { projectId: true },
  });
  if (!wbsNode || wbsNode.projectId !== projectId) {
    throw new DomainError("WBS node not found or not in this project", 404);
  }

  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  return db.scheduleActivity.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      name: input.name,
      baselineStart: new Date(input.baselineStart ?? input.plannedStart),
      baselineFinish: new Date(input.baselineFinish ?? input.plannedFinish),
      plannedStart: new Date(input.plannedStart),
      plannedFinish: new Date(input.plannedFinish),
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

export async function updateActivity(
  user: SessionUser,
  activityId: string,
  input: UpdateActivityInput
) {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: activityId },
    select: {
      wbsNodeId: true,
      wbsNode: { select: { projectId: true } },
      status: true,
      progressPercent: true,
    },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "schedule", "update");

  const scope = await getEffectiveScope(user, activity.wbsNode.projectId);
  assertScopeWritable(scope, activity.wbsNodeId);

  if (input.plannedStart && input.plannedFinish) {
    assertDateOrder(input.plannedStart, input.plannedFinish);
  }

  if (input.progressPercent !== undefined) {
    assertProgressPercent(input.progressPercent);
    await db.scheduleActivity.update({
      where: { id: activityId },
      data: { progressPercent: input.progressPercent },
    });
  }

  if (input.status && input.status !== activity.status) {
    assertStatusTransition(activity.status, input.status, ACTIVITY_STATUS_TRANSITIONS);
    if (input.status === "COMPLETE") {
      const { assertQualityGatePassed } = await import("@/lib/services/quality.service");
      await assertQualityGatePassed(activity.wbsNodeId);
    }
  }

  return db.scheduleActivity.update({
    where: { id: activityId },
    data: {
      name: input.name,
      plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
      plannedFinish: input.plannedFinish ? new Date(input.plannedFinish) : undefined,
      actualStart:
        input.actualStart === null
          ? null
          : input.actualStart
            ? new Date(input.actualStart)
            : undefined,
      actualFinish:
        input.actualFinish === null
          ? null
          : input.actualFinish
            ? new Date(input.actualFinish)
            : undefined,
      status: input.status,
      progressPercent: input.progressPercent,
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

export async function createDependency(
  user: SessionUser,
  input: CreateDependencyInput
) {
  const [predecessor, successor] = await Promise.all([
    db.scheduleActivity.findUnique({
      where: { id: input.predecessorId },
      select: { wbsNode: { select: { projectId: true } } },
    }),
    db.scheduleActivity.findUnique({
      where: { id: input.successorId },
      select: { wbsNode: { select: { projectId: true } } },
    }),
  ]);
  if (!predecessor || !successor) throw new DomainError("Schedule activity not found", 404);
  if (predecessor.wbsNode.projectId !== successor.wbsNode.projectId) {
    throw new DomainError("Activities must be in the same project", 400);
  }
  await assertProjectAccess(user, predecessor.wbsNode.projectId);
  assertPermission(user, "schedule", "create");

  const previousDeps = await db.scheduleDependency.findMany({
    where: { predecessorId: input.predecessorId },
    select: { predecessorId: true, successorId: true },
  });
  const edges = previousDeps.map(d => ({ from: d.predecessorId, to: d.successorId }));
  const wouldCycle = wouldCreateCycle(
    edges,
    input.predecessorId,
    input.successorId
  );
  if (wouldCycle) throw new DomainError("This dependency would create a cycle", 400);

  return db.scheduleDependency.create({
    data: {
      predecessorId: input.predecessorId,
      successorId: input.successorId,
      dependencyType: input.dependencyType ?? "FS",
      lagDays: input.lagDays ?? 0,
    },
    include: {
      predecessor: { select: { id: true, name: true } },
      successor: { select: { id: true, name: true } },
    },
  });
}

export async function listDependencies(
  user: SessionUser,
  activityId: string
) {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: activityId },
    select: { wbsNode: { select: { projectId: true } } },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "schedule", "read");

  return db.scheduleDependency.findMany({
    where: { OR: [{ predecessorId: activityId }, { successorId: activityId }] },
    include: {
      predecessor: { select: { id: true, name: true, status: true, progressPercent: true } },
      successor: { select: { id: true, name: true, status: true, progressPercent: true } },
    },
  });
}

// ── New: Pending Dependency Requests (cross-branch proposals) ─────────

type CreateDependencyRequestInput = {
  projectId: string;
  predecessorId: string;
  successorId: string;
  dependencyType?: DependencyType;
  lagDays?: number;
  justification: string;
};

/** Subcontractor or Site Engineer proposes a cross-branch dependency */
export async function createDependencyRequest(
  user: SessionUser,
  input: CreateDependencyRequestInput
) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "schedule", "create");

  const [pred, succ] = await Promise.all([
    db.scheduleActivity.findUnique({
      where: { id: input.predecessorId },
      select: { wbsNode: { select: { projectId: true } } },
    }),
    db.scheduleActivity.findUnique({
      where: { id: input.successorId },
      select: { wbsNode: { select: { projectId: true } } },
    }),
  ]);
  if (!pred || !succ) throw new DomainError("Activity not found", 404);
  if (pred.wbsNode.projectId !== input.projectId || succ.wbsNode.projectId !== input.projectId) {
    throw new DomainError("Activities must belong to the same project", 400);
  }

  return db.pendingDependencyRequest.create({
    data: {
      projectId: input.projectId,
      predecessorId: input.predecessorId,
      successorId: input.successorId,
      dependencyType: input.dependencyType ?? "FS",
      lagDays: input.lagDays ?? 0,
      justification: input.justification,
      requestedById: user.id,
    },
    include: {
      predecessor: { select: { id: true, name: true } },
      successor: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true } },
    },
  });
}

/** Review a dependency request (approve or decline) — only PM roles */
export async function reviewDependencyRequest(
  user: SessionUser,
  requestId: string,
  action: "approve" | "decline",
  declineReason?: string
) {
  const request = await db.pendingDependencyRequest.findUnique({
    where: { id: requestId },
    select: { projectId: true, status: true },
  });
  if (!request) throw new DomainError("Dependency request not found", 404);
  await assertProjectAccess(user, request.projectId);
  assertPermission(user, "schedule", "update");

  if (request.status !== "PENDING") {
    throw new DomainError("Request already reviewed", 400);
  }

  if (action === "approve") {
    const full = await db.pendingDependencyRequest.findUnique({
      where: { id: requestId },
      select: { predecessorId: true, successorId: true, dependencyType: true, lagDays: true },
    });
    if (!full) throw new DomainError("Request not found", 404);

    await db.scheduleDependency.create({
      data: {
        predecessorId: full.predecessorId,
        successorId: full.successorId,
        dependencyType: full.dependencyType,
        lagDays: full.lagDays,
      },
    });

    return db.pendingDependencyRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
    });
  }

  return db.pendingDependencyRequest.update({
    where: { id: requestId },
    data: {
      status: "DECLINED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      declineReason: declineReason ?? "Declined by reviewer",
    },
  });
}

/** List pending dependency requests for a project */
export async function listDependencyRequests(
  user: SessionUser,
  projectId: string,
  status?: "PENDING" | "APPROVED" | "DECLINED"
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "schedule", "read");

  return db.pendingDependencyRequest.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      predecessor: { select: { id: true, name: true } },
      successor: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, fullName: true, role: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });
}

// ── Ancestor-Walk Document Inheritance ───────────────────────────────

/** Get all ISSUED documents that apply to a WBS node (ancestor walk) */
export async function getInheritedDocuments(
  user: SessionUser,
  wbsNodeId: string,
  category?: string
) {
  const node = await db.wbsNode.findUnique({
    where: { id: wbsNodeId },
    select: { projectId: true },
  });
  if (!node) throw new DomainError("WBS node not found", 404);
  await assertProjectAccess(user, node.projectId);
  assertPermission(user, "document", "read");

  const documents = await db.$queryRaw<Array<{
    id: string; doc_no: string; title: string; category: string;
    revision_no: number; status: string; file_path: string | null;
  }>>`
    WITH RECURSIVE wbs_ancestors AS (
      SELECT id, parent_id FROM "WBSNode" WHERE id = ${wbsNodeId}
      UNION ALL
      SELECT w.id, w.parent_id FROM "WBSNode" w
      INNER JOIN wbs_ancestors wa ON w.id = wa.parent_id
    )
    SELECT pd.id, pd.doc_no, pd.title, pd.category, pd.revision_no, pd.status, pd.file_path
    FROM "ProjectDocument" pd
    INNER JOIN wbs_ancestors wa ON pd.wbs_node_id = wa.id
    WHERE pd.status = 'ISSUED'
    ${category ? Prisma.sql`AND pd.category = ${category}` : Prisma.empty}
    ORDER BY pd.category, pd.revision_no DESC;
  `;

  return documents;
}