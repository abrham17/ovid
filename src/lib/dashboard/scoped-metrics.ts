import { db } from "@/lib/db";
import type { OrgScope } from "@/lib/rbac/organizationScope";
import { getSensitivity } from "@/lib/dashboard/metric-registry";
import type { DashboardMetricKey } from "@/lib/dashboard/metric-keys";
import {
  contractIdFilter,
  isVisible,
  stoppageScopeWhere,
  wbsNodeIdDirectFilter,
  wbsNodeIdFilter,
  wbsRelationFilter,
} from "@/lib/dashboard/scoped-query";

export type ProjectScopedStats = {
  progress: number;
  openRisks: number;
  openIncidents: number;
  wbsNodeCount: number;
  contractValue: number | null;
};

/** Per-project scoped counts used by both dashboard services. */
export async function getProjectScopedStats(
  projectId: string,
  scope: OrgScope
): Promise<ProjectScopedStats> {
  const [progress, openRisks, openIncidents, wbsNodeCount, contractValue] = await Promise.all([
    getAvgProgress(projectId, scope),
    countOpenRisks(projectId, scope),
    countOpenIncidents(projectId, scope),
    countWbsNodes(projectId, scope),
    resolveProjectContractValue(projectId, scope),
  ]);

  return { progress, openRisks, openIncidents, wbsNodeCount, contractValue };
}

async function resolveProjectContractValue(projectId: string, scope: OrgScope): Promise<number | null> {
  if (!isVisible(scope, "contractValue")) return null;

  if (scope.ownContractIds === "ALL") {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { contractValue: true },
    });
    return project ? Number(project.contractValue) : null;
  }

  if (scope.ownContractIds.length === 0) return null;

  const ownContract = await db.contract.findFirst({
    where: { projectId, id: { in: scope.ownContractIds } },
    orderBy: { contractValue: "desc" },
    select: { contractValue: true },
  });

  return ownContract ? Number(ownContract.contractValue) : null;
}

export async function getAvgProgress(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "avgProgress")) return 0;

  const result = await db.scheduleActivity.aggregate({
    _avg: { progressPercent: true },
    where: {
      wbsNode: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("avgProgress")) },
    },
  });

  return Math.round(Number(result._avg.progressPercent ?? 0));
}

export async function countOpenRisks(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "openRisks")) return 0;

  return db.riskEntry.count({
    where: { projectId, status: { in: ["OPEN", "MITIGATING"] } },
  });
}

export async function countOpenIncidents(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "openIncidents")) return 0;

  return db.safetyIncident.count({
    where: {
      wbsNode: { projectId },
      status: { not: "CLOSED" },
    },
  });
}

export async function countWbsNodes(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "wbsNodeCount")) return 0;

  return db.wbsNode.count({
    where: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("wbsNodeCount")) },
  });
}

export async function countActivities(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "activityCount")) return 0;

  return db.scheduleActivity.count({
    where: {
      wbsNode: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("activityCount")) },
    },
  });
}

export async function countPendingDaily(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "pendingDaily")) return 0;

  const wbsFilter = wbsNodeIdDirectFilter(scope, getSensitivity("pendingDaily"));

  const [earthwork, structure, rebar] = await Promise.all([
    db.earthworkDailyEntry.count({ where: { projectId, status: "SUBMITTED", ...wbsFilter } }),
    db.structureDailyEntry.count({ where: { projectId, status: "SUBMITTED", ...wbsFilter } }),
    db.rebarDailyEntry.count({ where: { projectId, status: "SUBMITTED", ...wbsFilter } }),
  ]);

  return earthwork + structure + rebar;
}

export async function countMeasurements(
  projectId: string,
  scope: OrgScope,
  status?: "SUBMITTED" | "CERTIFIED"
): Promise<number> {
  const key = status === "CERTIFIED" ? "certifiedPayments" : "submittedMeasurements";
  if (!isVisible(scope, key)) return 0;

  return db.measurementEntry.count({
    where: {
      wbsNode: { projectId },
      ...(status ? { status } : {}),
      ...contractIdFilter(scope, getSensitivity(key)),
    },
  });
}

export async function countOverviewMeasurements(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "measurementCount")) return 0;

  return db.measurementEntry.count({
    where: {
      wbsNode: { projectId },
      ...contractIdFilter(scope, getSensitivity("measurementCount")),
    },
  });
}

export async function countCertifiedPaymentsOverview(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "certifiedPaymentsCount")) return 0;

  return db.measurementEntry.count({
    where: {
      wbsNode: { projectId },
      status: "CERTIFIED",
      ...contractIdFilter(scope, getSensitivity("certifiedPaymentsCount")),
    },
  });
}

export async function countOpenDefects(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "openDefects")) return 0;

  const { wbsNode } = wbsRelationFilter(scope, getSensitivity("openDefects"));

  return db.defectLog.count({
    where: {
      wbsNode: { projectId, ...wbsNode },
      status: { not: "VERIFIED_CLOSED" },
    },
  });
}

export async function countOpenPunches(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "openPunches")) return 0;

  return db.punchListItem.count({
    where: {
      wbsNode: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("openPunches")) },
      status: { not: "VERIFIED" },
    },
  });
}

export async function countMaterialDemands(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "materialDemands")) return 0;

  return db.materialDemand.count({
    where: {
      wbsNode: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("materialDemands")) },
      quantityDelivered: { lt: db.materialDemand.fields.quantityNeeded },
    },
  });
}

export async function countPurchaseOrders(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "purchaseOrders")) return 0;

  return db.purchaseOrder.count({
    where: {
      projectId,
      status: { in: ["DRAFT", "APPROVED", "ISSUED", "PARTIAL_RECEIVED"] },
    },
  });
}

export async function countPendingVariations(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "pendingVariations")) return 0;

  return db.variationOrder.count({
    where: { projectId, status: { notIn: ["CONSULTANT_APPROVED", "REJECTED"] } },
  });
}

export async function sumEquipmentDownHours(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "equipmentDownHours")) return 0;

  const result = await db.equipmentUsageLog.aggregate({
    _sum: { downHours: true },
    where: { projectId },
  });

  return Number(result._sum.downHours ?? 0);
}

export async function countLaborAssignments(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "laborAssignments")) return 0;

  return db.laborAssignment.count({
    where: {
      wbsNode: { projectId, ...wbsNodeIdFilter(scope, getSensitivity("laborAssignments")) },
    },
  });
}

export async function countDocumentsReview(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "documentsReview")) return 0;

  return db.projectDocument.count({
    where: { projectId, status: "UNDER_REVIEW" },
  });
}

export async function countRegulatoryReports(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "regulatoryReports")) return 0;

  return db.regulatoryReport.count({ where: { projectId } });
}

export async function countEquipmentLogs(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "equipmentCount")) return 0;

  return db.equipmentUsageLog.count({ where: { projectId } });
}

export async function countDocuments(projectId: string, scope: OrgScope): Promise<number> {
  if (!isVisible(scope, "documentCount")) return 0;

  return db.projectDocument.count({ where: { projectId } });
}

export async function getRecentStoppages(projectId: string, scope: OrgScope) {
  if (!isVisible(scope, "recentStoppages")) return [];

  return db.stoppageEntry.findMany({
    where: stoppageScopeWhere(projectId, scope),
    orderBy: { startTime: "desc" },
    take: 5,
    select: {
      id: true,
      stoppageType: true,
      reason: true,
      startTime: true,
      endTime: true,
    },
  });
}

/** Aggregates a dashboard metric across multiple per-project scopes. */
export async function aggregateDashboardMetric(
  projectIds: string[],
  scopesByProject: Map<string, OrgScope>,
  key: DashboardMetricKey
): Promise<number> {
  if (projectIds.length === 0) return 0;

  if (key === "projects") return projectIds.length;
  if (key === "users") return db.user.count({ where: { active: true } });
  if (key === "organizations") return db.organization.count();

  const results = await Promise.all(
    projectIds.map(async (projectId) => {
      const scope = scopesByProject.get(projectId);
      if (!scope) return 0;

      switch (key) {
        case "avgProgress":
          return getAvgProgress(projectId, scope);
        case "openRisks":
          return countOpenRisks(projectId, scope);
        case "openIncidents":
          return countOpenIncidents(projectId, scope);
        case "pendingDaily":
          return countPendingDaily(projectId, scope);
        case "submittedMeasurements":
          return countMeasurements(projectId, scope, "SUBMITTED");
        case "certifiedPayments":
          return countMeasurements(projectId, scope, "CERTIFIED");
        case "openDefects":
          return countOpenDefects(projectId, scope);
        case "openPunches":
          return countOpenPunches(projectId, scope);
        case "materialDemands":
          return countMaterialDemands(projectId, scope);
        case "purchaseOrders":
          return countPurchaseOrders(projectId, scope);
        case "pendingVariations":
          return countPendingVariations(projectId, scope);
        case "equipmentDownHours":
          return sumEquipmentDownHours(projectId, scope);
        case "laborAssignments":
          return countLaborAssignments(projectId, scope);
        case "documentsReview":
          return countDocumentsReview(projectId, scope);
        case "regulatoryReports":
          return countRegulatoryReports(projectId, scope);
        default:
          return 0;
      }
    })
  );

  if (key === "avgProgress") {
    const nonZero = results.filter((v) => v > 0);
    if (nonZero.length === 0) return 0;
    return Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);
  }

  return results.reduce((a, b) => a + b, 0);
}
