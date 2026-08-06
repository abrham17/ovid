import { db } from "@/lib/db";
import { getProjectParty, type SessionUser } from "@/lib/rbac";
import { getOrganizationScope } from "@/lib/rbac/organizationScope";
import { wbsNodeIdFilter } from "@/lib/dashboard/scoped-query";
import type { WBSNodeType } from "@/generated/prisma/enums";

export type WbsTreeNode = {
  id: string;
  code: string;
  name: string;
  nodeType: WBSNodeType;
  designReady: boolean;
  parentId: string | null;
  activityCount: number;
  boqItemCount: number;
  children: WbsTreeNode[];
  depth: number;
};

export type WbsWorkspaceData = {
  projectId: string;
  nodes: WbsTreeNode[];
  flatNodes: Array<{
    id: string;
    code: string;
    name: string;
    nodeType: WBSNodeType;
    parentId: string | null;
    designReady: boolean;
  }>;
  stats: {
    totalNodes: number;
    phaseCount: number;
    sectionCount: number;
    activityNodeCount: number;
    designReadyCount: number;
    designReadyPercent: number;
  };
  canEditWbs: boolean;
};

export async function getWbsWorkspaceData(
  user: SessionUser,
  projectId: string
): Promise<WbsWorkspaceData | null> {
  const party = await getProjectParty(user, projectId);
  if (!party) return null;

  const scope = await getOrganizationScope(user, projectId);
  if (!scope) return null;

  const whereFilter = wbsNodeIdFilter(scope, "OPERATIONAL");

  const rawNodes = await db.wbsNode.findMany({
    where: {
      projectId,
      ...whereFilter,
    },
    select: {
      id: true,
      code: true,
      name: true,
      nodeType: true,
      designReady: true,
      parentId: true,
      _count: {
        select: {
          activities: true,
          boqItems: true,
        },
      },
    },
    orderBy: { code: "asc" },
  });

  // Calculate statistics
  const totalNodes = rawNodes.length;
  const phaseCount = rawNodes.filter((n) => n.nodeType === "PHASE").length;
  const sectionCount = rawNodes.filter((n) => n.nodeType === "SECTION").length;
  const activityNodeCount = rawNodes.filter((n) => n.nodeType === "ACTIVITY").length;
  const designReadyCount = rawNodes.filter((n) => n.designReady).length;
  const designReadyPercent = totalNodes > 0 ? Math.round((designReadyCount / totalNodes) * 100) : 0;

  // Build tree structure
  const nodeMap = new Map<string, WbsTreeNode>();
  const rootNodes: WbsTreeNode[] = [];

  // Initialize node objects
  rawNodes.forEach((n) => {
    nodeMap.set(n.id, {
      id: n.id,
      code: n.code,
      name: n.name,
      nodeType: n.nodeType,
      designReady: n.designReady,
      parentId: n.parentId,
      activityCount: n._count.activities,
      boqItemCount: n._count.boqItems,
      children: [],
      depth: 0,
    });
  });

  // Attach children to parents
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Helper to re-assign correct depth recursively
  function setDepth(node: WbsTreeNode, currentDepth: number) {
    node.depth = currentDepth;
    node.children.forEach((child) => setDepth(child, currentDepth + 1));
  }
  rootNodes.forEach((root) => setDepth(root, 0));

  const canEditWbs =
    party.partyType === "CONTRACTOR" &&
    ["ADMIN", "SENIOR_PM", "DEPUTY_PM", "SITE_ENGINEER"].includes(user.role);

  return {
    projectId,
    nodes: rootNodes,
    flatNodes: rawNodes.map((n) => ({
      id: n.id,
      code: n.code,
      name: n.name,
      nodeType: n.nodeType,
      parentId: n.parentId,
      designReady: n.designReady,
    })),
    stats: {
      totalNodes,
      phaseCount,
      sectionCount,
      activityNodeCount,
      designReadyCount,
      designReadyPercent,
    },
    canEditWbs,
  };
}
