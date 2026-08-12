import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateWbsNodeInput,
  UpdateWbsNodeInput,
} from "@/lib/validations/project";
import { Prisma } from "@/generated/prisma/client";
import {
  getEffectiveScope,
  assertScopeWritable,
  isAll,
  isWbsVisible,
} from "@/lib/scope";

export async function listProjects(
  user: SessionUser,
  opts?: { status?: string; search?: string }
) {
  assertPermission(user, "project", "read");

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
  assertPermission(user, "project", "create");

  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        code: input.code,
        name: input.name,
        projectType: input.projectType,
        contractType: input.contractType ?? "FIDIC_RED",
        status: input.status ?? "PLANNING",
        contractValue: new Prisma.Decimal(input.contractValue),
        plannedStartDate: new Date(input.plannedStartDate),
        plannedEndDate: new Date(input.plannedEndDate),
        contractorOrgId: user.organizationId,
        clientOrgId: input.clientOrgId,
        consultantOrgId: input.consultantOrgId ?? null,
      },
    });

    await tx.projectMembership.create({
      data: {
        projectId: project.id,
        userId: user.id,
        organizationId: user.organizationId,
        projectRole: user.role,
      },
    });

    await tx.wbsNode.create({
      data: {
        projectId: project.id,
        name: "Project Root",
        code: "0",
        nodeType: "PHASE",
      },
    });

    return project;
  });
}

export async function updateProject(
  user: SessionUser,
  projectId: string,
  input: UpdateProjectInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  return db.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      code: input.code,
      projectType: input.projectType,
      contractType: input.contractType,
      status: input.status,
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

  // SE/Superintendent: full org-ceiling tree for context; Foreman: assignment context only
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
    // Creating a root requires full writable (PM-tier)
    if (!isAll(scope.writableWbsNodeIds)) {
      throw new Error("You cannot create a root WBS node outside your writable scope");
    }
  }

  const codeClash = await db.wbsNode.findFirst({
    where: { projectId, code: input.code },
  });
  if (codeClash) throw new Error(`WBS code "${input.code}" already exists on this project`);

  // A node created inside an open plan submission is DRAFT: excluded from the
  // live rollup and from other parties until the Contractor PM approves the
  // whole submission (file 20 §3.2).
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

    // Walk ancestors of new parent — must not hit nodeId (cycle)
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

/** Design-readiness gate — incomplete design is a leading overrun cause. */
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
