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
      _count: { select: { memberships: true, wbsNodes: true, stoppages: true, variations: true, risks: true, earthworkDailyEntries: true } },
    },
  });

  // Count nested relations (through WbsNode)
  const [scheduleActivitiesCount, defectLogsCount, safetyIncidentsCount] = await Promise.all([
    db.scheduleActivity.count({ where: { wbsNode: { projectId } } }),
    db.defectLog.count({ where: { wbsNode: { projectId } } }),
    db.safetyIncident.count({ where: { wbsNode: { projectId } } }),
  ]);

  return {
    ...project,
    _count: {
      ...project._count,
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

  const nodes = await db.wbsNode.findMany({
    where: { projectId },
    orderBy: [{ code: "asc" }],
  });

  // Build tree
  type Node = (typeof nodes)[0] & { children: Node[] };
  const map = new Map<string, Node>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
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

  if (input.parentId) {
    const parent = await db.wbsNode.findFirst({
      where: { id: input.parentId, projectId },
    });
    if (!parent) throw new Error("Parent WBS node not found on this project");
  }

  const codeClash = await db.wbsNode.findFirst({
    where: { projectId, code: input.code },
  });
  if (codeClash) throw new Error(`WBS code "${input.code}" already exists on this project`);

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
  if (node._count.children > 0) {
    throw new Error("Cannot delete a node that still has children — remove children first");
  }
  if (node._count.activities > 0) {
    throw new Error("Cannot delete a node that still has schedule activities — reassign or remove them first");
  }

  return db.wbsNode.delete({ where: { id: nodeId } });
}
