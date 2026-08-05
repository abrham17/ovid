import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { OrgScope } from "@/lib/rbac/organizationScope";
import {
  getSensitivity,
  OPERATIONAL_METRIC_KEYS,
  type SensitivityClass,
} from "@/lib/dashboard/metric-registry";
import type { ScopedMetricKey } from "@/lib/dashboard/metric-keys";

export function buildScopeBanner(scope: OrgScope): string | null {
  if (scope.partyType === "SUBCONTRACTOR") {
    return "Showing data for your contracted work packages only.";
  }
  if (scope.partyType === "SUPPLIER") {
    return "Showing procurement-related data only.";
  }
  return null;
}

export function isVisible(scope: OrgScope, key: ScopedMetricKey): boolean {
  const sensitivity = getSensitivity(key);

  if (sensitivity === "COST_DETAIL") {
    return scope.canViewCostDetail;
  }

  if (OPERATIONAL_METRIC_KEYS.has(key) && !scope.canViewOperationalData) {
    return false;
  }

  if (sensitivity === "OWN_CONTRACT_ONLY") {
    if (scope.ownContractIds === "ALL") return true;
    return scope.ownContractIds.length > 0;
  }

  return true;
}

export function wbsNodeIdFilter(scope: OrgScope, sensitivity: SensitivityClass): Prisma.WbsNodeWhereInput {
  if (sensitivity !== "BRANCH_SCOPED" && sensitivity !== "OTHER_PARTY_EVENTS") {
    return {};
  }
  if (scope.visibleWbsNodeIds === "ALL") return {};
  return { id: { in: scope.visibleWbsNodeIds } };
}

export function wbsRelationFilter(
  scope: OrgScope,
  sensitivity: SensitivityClass
): { wbsNode: Prisma.WbsNodeWhereInput } {
  const nodeFilter = wbsNodeIdFilter(scope, sensitivity);
  if (Object.keys(nodeFilter).length === 0) return { wbsNode: {} };
  return { wbsNode: nodeFilter };
}

export function wbsNodeIdDirectFilter(
  scope: OrgScope,
  sensitivity: SensitivityClass
): { wbsNodeId?: { in: string[] } } {
  if (sensitivity !== "BRANCH_SCOPED" && sensitivity !== "OTHER_PARTY_EVENTS") {
    return {};
  }
  if (scope.visibleWbsNodeIds === "ALL") return {};
  return { wbsNodeId: { in: scope.visibleWbsNodeIds } };
}

export function contractIdFilter(
  scope: OrgScope,
  sensitivity: SensitivityClass
): { contractId?: { in: string[] } } {
  if (sensitivity !== "OWN_CONTRACT_ONLY") return {};
  if (scope.ownContractIds === "ALL") return {};
  return { contractId: { in: scope.ownContractIds } };
}

export function stoppageScopeWhere(
  projectId: string,
  scope: OrgScope
): Prisma.StoppageEntryWhereInput {
  const sensitivity = getSensitivity("recentStoppages");
  const base: Prisma.StoppageEntryWhereInput = { projectId };

  if (scope.visibleWbsNodeIds === "ALL") {
    return base;
  }

  if (!scope.canViewOtherPartiesEvents) {
    return {
      ...base,
      OR: [
        { wbsNodeId: { in: scope.visibleWbsNodeIds } },
        { scheduleActivity: { wbsNodeId: { in: scope.visibleWbsNodeIds } } },
      ],
    };
  }

  void sensitivity;
  return base;
}

export async function resolveContractValue(
  scope: OrgScope,
  project: { id: string; contractValue: unknown }
): Promise<number | null> {
  if (!isVisible(scope, "contractValue")) return null;

  if (scope.ownContractIds === "ALL") {
    return Number(project.contractValue);
  }

  if (scope.ownContractIds.length === 0) return null;

  const ownContract = await db.contract.findFirst({
    where: { projectId: project.id, id: { in: scope.ownContractIds } },
    orderBy: { contractValue: "desc" },
    select: { contractValue: true },
  });

  return ownContract ? Number(ownContract.contractValue) : null;
}
