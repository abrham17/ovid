import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Recursive descendants including the root itself. */
export async function getDescendantIds(rootIds: string[]): Promise<Set<string>> {
  if (rootIds.length === 0) return new Set();
  const unique = [...new Set(rootIds)];
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE wbs_descendants AS (
      SELECT id, "parentId" FROM "WBSNode" WHERE id IN (${Prisma.join(unique)})
      UNION ALL
      SELECT w.id, w."parentId" FROM "WBSNode" w
      INNER JOIN wbs_descendants wd ON w."parentId" = wd.id
    )
    SELECT DISTINCT id FROM wbs_descendants
  `;
  return new Set(rows.map((r) => r.id));
}

/** Ancestors including the node itself. */
export async function getAncestorIds(nodeId: string): Promise<Set<string>> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE wbs_ancestors AS (
      SELECT id, "parentId" FROM "WBSNode" WHERE id = ${nodeId}
      UNION ALL
      SELECT w.id, w."parentId" FROM "WBSNode" w
      INNER JOIN wbs_ancestors wa ON w.id = wa."parentId"
    )
    SELECT id FROM wbs_ancestors
  `;
  return new Set(rows.map((r) => r.id));
}

/**
 * Foreman one-level-up context: for each assigned WBS node, include the node,
 * its parent, and all siblings of the node (children of that parent).
 */
export async function getOneLevelUpContext(nodeIds: string[]): Promise<Set<string>> {
  if (nodeIds.length === 0) return new Set();
  const unique = [...new Set(nodeIds)];
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH assigned AS (
      SELECT id, "parentId" FROM "WBSNode" WHERE id IN (${Prisma.join(unique)})
    ),
    parents AS (
      SELECT DISTINCT "parentId" AS id FROM assigned WHERE "parentId" IS NOT NULL
    ),
    siblings AS (
      SELECT w.id FROM "WBSNode" w
      INNER JOIN parents p ON w."parentId" = p.id
    )
    SELECT id FROM assigned
    UNION
    SELECT id FROM parents
    UNION
    SELECT id FROM siblings
  `;
  return new Set(rows.map((r) => r.id));
}

/** All WBS node IDs for a project. */
export async function getAllProjectWbsIds(projectId: string): Promise<Set<string>> {
  const nodes = await db.wbsNode.findMany({
    where: { projectId },
    select: { id: true },
  });
  return new Set(nodes.map((n) => n.id));
}
