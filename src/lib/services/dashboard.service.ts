import { db } from "@/lib/db";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export type MetricKey =
  | "projects"
  | "avgProgress"
  | "openRisks"
  | "openIncidents"
  | "pendingDaily"
  | "submittedMeasurements"
  | "certifiedPayments"
  | "openDefects"
  | "openPunches"
  | "materialDemands"
  | "purchaseOrders"
  | "pendingVariations"
  | "equipmentDownHours"
  | "laborAssignments"
  | "documentsReview"
  | "regulatoryReports"
  | "users"
  | "organizations";

export type ProjectSnapshot = {
  id: string;
  name: string;
  code: string;
  status: string;
  contractValue: unknown;
  progress: number;
  openRisks: number;
  openIncidents: number;
};

export type DashboardDataPayload = {
  metrics: Record<MetricKey, number>;
  projects: ProjectSnapshot[];
};

/**
 * Backend Data Access Service for Dashboard
 * Filters database queries strictly by Layer-1 (Organization Party) and Layer-2 (User Role).
 */
export async function getDashboardData({
  userId,
  organizationId,
  role,
  partyType,
}: {
  userId: string;
  organizationId: string;
  role: UserRole;
  partyType: PartyType;
}): Promise<DashboardDataPayload> {
  // Layer 1 Filtering: ADMIN sees all; CONTRACTOR/CLIENT/CONSULTANT see projects where their org is primary; SUBCONTRACTOR/SUPPLIER/REGULATOR require membership.
  const projectWhere =
    role === "ADMIN"
      ? {}
      : {
          OR: [
            { contractorOrgId: organizationId },
            { clientOrgId: organizationId },
            { consultantOrgId: organizationId },
            { memberships: { some: { OR: [{ userId }, { organizationId }] } } },
          ],
        };

  const projects = await db.project.findMany({
    where: projectWhere,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      contractValue: true,
    },
  });
  const projectIds = projects.map((p) => p.id);

  const [
    activityProgress,
    openRisks,
    openIncidents,
    pendingEarthwork,
    pendingStructure,
    pendingRebar,
    submittedMeasurements,
    certifiedPayments,
    openDefects,
    openPunches,
    materialDemands,
    purchaseOrders,
    pendingVariations,
    equipmentUsage,
    laborAssignments,
    documentsReview,
    regulatoryReports,
    users,
    organizations,
    projectStats,
  ] = await Promise.all([
    db.scheduleActivity.aggregate({
      _avg: { progressPercent: true },
      where: { wbsNode: { projectId: { in: projectIds } } },
    }),
    db.riskEntry.count({ where: { projectId: { in: projectIds }, status: { in: ["OPEN", "MITIGATING"] } } }),
    db.safetyIncident.count({ where: { wbsNode: { projectId: { in: projectIds } }, status: { not: "CLOSED" } } }),
    db.earthworkDailyEntry.count({ where: { projectId: { in: projectIds }, status: "SUBMITTED" } }),
    db.structureDailyEntry.count({ where: { projectId: { in: projectIds }, status: "SUBMITTED" } }),
    db.rebarDailyEntry.count({ where: { projectId: { in: projectIds }, status: "SUBMITTED" } }),
    db.measurementEntry.count({ where: { wbsNode: { projectId: { in: projectIds } }, status: "SUBMITTED" } }),
    db.measurementEntry.count({ where: { wbsNode: { projectId: { in: projectIds } }, status: "CERTIFIED" } }),
    db.defectLog.count({ where: { wbsNode: { projectId: { in: projectIds } }, status: { not: "VERIFIED_CLOSED" } } }),
    db.punchListItem.count({ where: { wbsNode: { projectId: { in: projectIds } }, status: { not: "VERIFIED" } } }),
    db.materialDemand.count({
      where: {
        wbsNode: { projectId: { in: projectIds } },
        quantityDelivered: { lt: db.materialDemand.fields.quantityNeeded },
      },
    }),
    db.purchaseOrder.count({
      where: { projectId: { in: projectIds }, status: { in: ["DRAFT", "APPROVED", "ISSUED", "PARTIAL_RECEIVED"] } },
    }),
    db.variationOrder.count({
      where: { projectId: { in: projectIds }, status: { notIn: ["CONSULTANT_APPROVED", "REJECTED"] } },
    }),
    db.equipmentUsageLog.aggregate({
      _sum: { downHours: true },
      where: { projectId: { in: projectIds } },
    }),
    db.laborAssignment.count({ where: { wbsNode: { projectId: { in: projectIds } } } }),
    db.projectDocument.count({ where: { projectId: { in: projectIds }, status: "UNDER_REVIEW" } }),
    db.regulatoryReport.count({ where: { projectId: { in: projectIds } } }),
    db.user.count({ where: { active: true } }),
    db.organization.count(),
    Promise.all(
      projectIds.map(async (projectId) => {
        const [progress, risks, incidents] = await Promise.all([
          db.scheduleActivity.aggregate({
            _avg: { progressPercent: true },
            where: { wbsNode: { projectId } },
          }),
          db.riskEntry.count({ where: { projectId, status: { in: ["OPEN", "MITIGATING"] } } }),
          db.safetyIncident.count({ where: { wbsNode: { projectId }, status: { not: "CLOSED" } } }),
        ]);
        return {
          projectId,
          progress: Math.round(Number(progress._avg.progressPercent ?? 0)),
          openRisks: risks,
          openIncidents: incidents,
        };
      })
    ),
  ]);

  const statsByProject = new Map(projectStats.map((stat) => [stat.projectId, stat]));

  return {
    metrics: {
      projects: projects.length,
      avgProgress: Math.round(Number(activityProgress._avg.progressPercent ?? 0)),
      openRisks,
      openIncidents,
      pendingDaily: pendingEarthwork + pendingStructure + pendingRebar,
      submittedMeasurements,
      certifiedPayments,
      openDefects,
      openPunches,
      materialDemands,
      purchaseOrders,
      pendingVariations,
      equipmentDownHours: Number(equipmentUsage._sum.downHours ?? 0),
      laborAssignments,
      documentsReview,
      regulatoryReports,
      users,
      organizations,
    },
    projects: projects.map((project) => {
      const stats = statsByProject.get(project.id);
      return {
        ...project,
        progress: stats?.progress ?? 0,
        openRisks: stats?.openRisks ?? 0,
        openIncidents: stats?.openIncidents ?? 0,
      };
    }),
  };
}
