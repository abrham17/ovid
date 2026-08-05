import { db } from "@/lib/db";
import { getProjectParty, type SessionUser } from "@/lib/rbac";
import type { PartyType } from "@/generated/prisma/enums";

export type OrgScope = {
  partyType: PartyType;
  /** Which WBSNode ids this party may see structural/operational data for. */
  visibleWbsNodeIds: string[] | "ALL";
  /** Contract ids belonging to this party — governs measurement and payment visibility. */
  ownContractIds: string[] | "ALL";
  /** Budgeted unit rates, actual cost, margin. */
  canViewCostDetail: boolean;
  /** Daily reports, equipment logs, and other day-to-day operational records. */
  canViewOperationalData: boolean;
  /** Events outside this party's own branch. */
  canViewOtherPartiesEvents: boolean;
};

async function getScopedContracts(organizationId: string, projectId: string) {
  return db.contract.findMany({
    where: { projectId, contractorOrgId: organizationId },
    select: { id: true },
  });
}

/** Expands seed WBS nodes to include all descendants within the project tree. */
async function resolveSubtree(projectId: string, seedNodeIds: string[]): Promise<string[]> {
  if (seedNodeIds.length === 0) return [];

  const allNodes = await db.wbsNode.findMany({
    where: { projectId },
    select: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const node of allNodes) {
    if (!node.parentId) continue;
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node.id);
    childrenByParent.set(node.parentId, siblings);
  }

  const visible = new Set<string>(seedNodeIds);
  const queue = [...seedNodeIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!visible.has(childId)) {
        visible.add(childId);
        queue.push(childId);
      }
    }
  }

  return [...visible];
}

async function resolveWbsFromContracts(projectId: string, contractIds: string[]): Promise<string[]> {
  if (contractIds.length === 0) return [];

  const measurements = await db.measurementEntry.findMany({
    where: { contractId: { in: contractIds } },
    select: { wbsNodeId: true },
    distinct: ["wbsNodeId"],
  });

  const seedIds = measurements.map((m) => m.wbsNodeId);
  return resolveSubtree(projectId, seedIds);
}

/**
 * Single source of party-based visibility for all dashboard data queries.
 * Returns null when the user has no access to the project.
 */
export async function getOrganizationScope(
  user: SessionUser,
  projectId: string
): Promise<OrgScope | null> {
  const party = await getProjectParty(user, projectId);
  if (!party) return null;

  if (party.partyType === "SUBCONTRACTOR") {
    const contracts = await getScopedContracts(party.organizationId, projectId);
    const contractIds = contracts.map((c) => c.id);
    const visibleWbsNodeIds = await resolveWbsFromContracts(projectId, contractIds);

    return {
      partyType: "SUBCONTRACTOR",
      visibleWbsNodeIds,
      ownContractIds: contractIds,
      canViewCostDetail: false,
      canViewOperationalData: true,
      canViewOtherPartiesEvents: false,
    };
  }

  if (party.partyType === "SUPPLIER") {
    return {
      partyType: "SUPPLIER",
      visibleWbsNodeIds: [],
      ownContractIds: [],
      canViewCostDetail: false,
      canViewOperationalData: false,
      canViewOtherPartiesEvents: false,
    };
  }

  if (party.partyType === "CONSULTANT" || party.partyType === "CLIENT") {
    return {
      partyType: party.partyType,
      visibleWbsNodeIds: "ALL",
      ownContractIds: "ALL",
      canViewCostDetail: false,
      canViewOperationalData: party.partyType === "CONSULTANT",
      canViewOtherPartiesEvents: true,
    };
  }

  if (party.partyType === "REGULATOR") {
    return {
      partyType: "REGULATOR",
      visibleWbsNodeIds: "ALL",
      ownContractIds: "ALL",
      canViewCostDetail: false,
      canViewOperationalData: false,
      canViewOtherPartiesEvents: true,
    };
  }

  // CONTRACTOR (ADMIN is treated as contractor per getProjectParty)
  return {
    partyType: "CONTRACTOR",
    visibleWbsNodeIds: "ALL",
    ownContractIds: "ALL",
    canViewCostDetail: true,
    canViewOperationalData: true,
    canViewOtherPartiesEvents: true,
  };
}
