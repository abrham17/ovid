import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export type MetricKey =
  | "activeProjects"
  | "projects"
  | "openIncidents"
  | "openDefects"
  | "openPunches"
  | "openRisks"
  | "pendingMeasurements"
  | "submittedMeasurements"
  | "pendingVariations"
  | "recentStoppages"
  | "designPending"
  | "teamSize"
  | "pendingDaily"
  | "avgProgress"
  | "certifiedPayments"
  | "documentsReview"
  | "equipmentDownHours"
  | "laborAssignments"
  | "materialDemands"
  | "purchaseOrders"
  | "regulatoryReports"
  | "organizations"
  | "users"
  | "pendingITRs"
  | "overallProgress"
  | "overdueActivities"
  | "pendingReviews"
  | "activeSubcontractors"
  | "pendingInspections";

export type PortfolioProject = {
  id: string;
  code: string;
  name: string;
  status: string;
  projectType: string;
  contractValue: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  openRisks: number;
  openIncidents: number;
  pendingMeasurements: number;
};

export type DashboardDataPayload = {
  metrics: Partial<Record<MetricKey, number>>;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    status: string;
    projectType?: string;
    contractValue?: number;
    progress: number;
    openRisks: number;
    openIncidents: number;
  }>;
  portfolio: PortfolioProject[];
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    at: string;
    href?: string;
  }>;
};

async function visibleProjectIds(user: SessionUser): Promise<string[]> {
  const memberships = await db.projectMembership.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const fromMembership = memberships.map((m) => m.projectId);

  const orgProjects = await db.project.findMany({
    where: {
      OR: [
        { contractorOrgId: user.organizationId },
        { clientOrgId: user.organizationId },
        { consultantOrgId: user.organizationId },
      ],
    },
    select: { id: true },
  });

  return Array.from(new Set([...fromMembership, ...orgProjects.map((p) => p.id)]));
}

export async function getPortfolioDashboard(
  user: SessionUser
): Promise<DashboardDataPayload> {
  const ids = await visibleProjectIds(user);

  const projects = await db.project.findMany({
    where: { id: { in: ids.length ? ids : ["__none__"] } },
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  });

  const projectIds = projects.map((p) => p.id);
  const empty = projectIds.length === 0;

  const safeIds = empty ? ["__none__"] : projectIds;

  const [
    openIncidents,
    openDefects,
    openPunches,
    openRisks,
    pendingMeasurements,
    submittedMeasurements,
    pendingVariations,
    recentStoppages,
    designPending,
    pendingDaily,
    certifiedAgg,
    documentsReview,
    equipmentDown,
    laborAssignments,
    materialDemands,
    purchaseOrders,
    regulatoryReports,
    activities,
    organizations,
    users,
  ] = await Promise.all([
    db.safetyIncident.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: { in: ["OPEN", "ACTION_PENDING"] },
      },
    }),
    db.defectLog.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: { in: ["OPEN", "REWORK_IN_PROGRESS"] },
      },
    }),
    db.punchListItem.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: { in: ["OPEN", "RESOLVED"] },
      },
    }),
    db.riskEntry.count({
      where: {
        projectId: { in: safeIds },
        status: { in: ["OPEN", "MITIGATING"] },
      },
    }),
    db.measurementEntry.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: { in: ["DRAFT", "SUBMITTED", "CONSULTANT_QUERIED"] },
      },
    }),
    db.measurementEntry.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: "SUBMITTED",
      },
    }),
    db.variationOrder.count({
      where: {
        projectId: { in: safeIds },
        status: { notIn: ["CONSULTANT_APPROVED", "REJECTED"] },
      },
    }),
    db.stoppageEntry.count({
      where: {
        projectId: { in: safeIds },
        startTime: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.wbsNode.count({
      where: { projectId: { in: safeIds }, designReady: false },
    }),
    // Approximate pending daily: structure drafts in last 7 days
    db.structureDailyEntry.count({
      where: {
        projectId: { in: safeIds },
        status: { in: ["DRAFT", "SUBMITTED"] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }).catch(() => 0),
    db.measurementEntry.findMany({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        status: { in: ["CERTIFIED", "PAID"] },
      },
      select: { quantity: true, unitRate: true },
    }),
    db.projectDocument.count({
      where: {
        projectId: { in: safeIds },
        status: { in: ["DRAFT", "UNDER_REVIEW"] },
      },
    }),
    db.equipmentUsageLog
      .aggregate({
        where: { projectId: { in: safeIds } },
        _sum: { downHours: true },
      })
      .then((r) => Number(r._sum.downHours ?? 0))
      .catch(() => 0),
    db.laborAssignment.count({
      where: {
        wbsNode: { projectId: { in: safeIds } },
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.materialDemand.count({
      where: { wbsNode: { projectId: { in: safeIds } } },
    }),
    db.purchaseOrder.count({
      where: {
        projectId: { in: safeIds },
        status: { in: ["DRAFT", "APPROVED", "ISSUED", "PARTIAL_RECEIVED"] },
      },
    }),
    db.regulatoryReport.count({
      where: { projectId: { in: safeIds } },
    }),
    db.scheduleActivity.findMany({
      where: { wbsNode: { projectId: { in: safeIds } } },
      select: { progressPercent: true },
    }),
    db.organization.count(),
    db.user.count({ where: { organizationId: user.organizationId } }),
  ]);

  const certifiedPayments = certifiedAgg.reduce(
    (s, m) => s + Number(m.quantity) * Number(m.unitRate),
    0
  );
  const avgProgress =
    activities.length > 0
      ? activities.reduce((s, a) => s + Number(a.progressPercent), 0) /
        activities.length
      : 0;

  const metrics: Partial<Record<MetricKey, number>> = {
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    projects: projects.length,
    openIncidents,
    openDefects,
    openPunches,
    openRisks,
    pendingMeasurements,
    submittedMeasurements,
    pendingVariations,
    recentStoppages,
    designPending,
    teamSize: projects.reduce((s, p) => s + (p._count?.memberships ?? 0), 0),
    pendingDaily: typeof pendingDaily === "number" ? pendingDaily : 0,
    avgProgress: Math.round(avgProgress),
    certifiedPayments: Math.round(certifiedPayments),
    documentsReview,
    equipmentDownHours: Math.round(Number(equipmentDown)),
    laborAssignments,
    materialDemands,
    purchaseOrders,
    regulatoryReports,
    organizations,
    users,
  };

  // Derived "executive" metrics from the same project set (single source of truth)
  const [overdueCount, pendingReviews, activeSubcontractorCount, pendingInspectionCount] =
    await Promise.all([
      // Overdue activities across visible projects
      db.scheduleActivity.count({
        where: {
          wbsNode: { projectId: { in: projectIds } },
          status: "NOT_STARTED",
          plannedFinish: { lt: new Date() },
        },
      }),
      // Pending review comments (decisions awaiting action)
      db.reviewComment.count({
        where: {
          projectId: { in: projectIds },
        },
      }),
      // Active subcontracts
      db.contract.count({
        where: {
          projectId: { in: projectIds },
          status: "ACTIVE",
        },
      }),
      // Pending inspections (OPEN ITRs needing verification)
      db.inspectionTestRecord.count({
        where: {
          wbsNode: { projectId: { in: projectIds } },
        },
      }),
    ]);

  metrics.overdueActivities = overdueCount;
  metrics.pendingReviews = pendingReviews;
  metrics.activeSubcontractors = activeSubcontractorCount;
  metrics.pendingInspections = pendingInspectionCount;
  metrics.overallProgress = Math.round(avgProgress);

  const portfolio: PortfolioProject[] = await Promise.all(
    projects.map(async (p) => {
      const [r, inc, meas] = await Promise.all([
        db.riskEntry.count({
          where: { projectId: p.id, status: { in: ["OPEN", "MITIGATING"] } },
        }),
        db.safetyIncident.count({
          where: {
            wbsNode: { projectId: p.id },
            status: { in: ["OPEN", "ACTION_PENDING"] },
          },
        }),
        db.measurementEntry.count({
          where: {
            wbsNode: { projectId: p.id },
            status: { in: ["DRAFT", "SUBMITTED", "CONSULTANT_QUERIED"] },
          },
        }),
      ]);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        contractValue: Number(p.contractValue),
        plannedStartDate: p.plannedStartDate,
        plannedEndDate: p.plannedEndDate,
        openRisks: r,
        openIncidents: inc,
        pendingMeasurements: meas,
      };
    })
  );

  return {
    metrics,
    projects: projects.map((p) => {
      const portfolioItem = portfolio.find((pp) => pp.id === p.id);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        contractValue: Number(p.contractValue),
        progress: portfolioItem ? Math.round((1 - (portfolioItem.pendingMeasurements / Math.max(1, portfolioItem.pendingMeasurements + 10))) * 100) : 0,
        openRisks: portfolioItem?.openRisks ?? 0,
        openIncidents: portfolioItem?.openIncidents ?? 0,
      };
    }),
    portfolio,
    recentActivity: [],
  };
}

export async function getDashboardData(params: {
  userId: string;
  organizationId: string;
  role: string;
  partyType: string;
  projectId?: string;
}): Promise<DashboardDataPayload> {
  const user = {
    id: params.userId,
    email: "",
    name: "",
    organizationId: params.organizationId,
    organizationName: "",
    role: params.role as SessionUser["role"],
    partyType: params.partyType as SessionUser["partyType"],
  } satisfies SessionUser;

  // Single-project scoped dashboard (Overview) — apply EffectiveScope WBS filters
  if (params.projectId) {
    const { getEffectiveScope, isAll, activityWbsFilter } = await import("@/lib/scope");
    const { getProjectHealth, computeProjectProgress } = await import(
      "@/lib/services/progress.service"
    );
    const scope = await getEffectiveScope(user, params.projectId);
    const wbsFilter = activityWbsFilter(scope.visibleWbsNodeIds);
    const projectId = params.projectId;

    const health = await getProjectHealth(projectId, user);
    const progress = await computeProjectProgress(projectId, user);

    const [
      openIncidents,
      openDefects,
      openPunches,
      openRisks,
      pendingMeasurements,
      pendingDaily,
      documentsReview,
    ] = await Promise.all([
      db.safetyIncident.count({
        where: {
          wbsNode: { projectId },
          ...wbsFilter,
          status: { in: ["OPEN", "ACTION_PENDING"] },
        },
      }),
      db.defectLog.count({
        where: {
          wbsNode: { projectId },
          ...wbsFilter,
          status: { in: ["OPEN", "REWORK_IN_PROGRESS"] },
        },
      }),
      db.punchListItem.count({
        where: {
          wbsNode: { projectId },
          ...wbsFilter,
          status: { in: ["OPEN", "RESOLVED"] },
        },
      }),
      db.riskEntry.count({
        where: {
          projectId,
          status: { in: ["OPEN", "MITIGATING"] },
          ...(isAll(scope.visibleWbsNodeIds)
            ? {}
            : {
                OR: [
                  { wbsNodeId: null },
                  { wbsNodeId: { in: [...scope.visibleWbsNodeIds] } },
                ],
              }),
        },
      }),
      db.measurementEntry.count({
        where: {
          wbsNode: { projectId },
          ...wbsFilter,
          status: { in: ["DRAFT", "SUBMITTED", "CONSULTANT_QUERIED"] },
        },
      }),
      db.structureDailyEntry.count({
        where: {
          projectId,
          ...(!isAll(scope.visibleWbsNodeIds)
            ? { wbsNodeId: { in: [...scope.visibleWbsNodeIds] } }
            : {}),
          status: { in: ["DRAFT", "SUBMITTED"] },
        },
      }),
      db.projectDocument.count({
        where: {
          projectId,
          status: { in: ["DRAFT", "UNDER_REVIEW"] },
          ...(isAll(scope.visibleWbsNodeIds)
            ? {}
            : {
                OR: [
                  { wbsNodeId: null },
                  { wbsNodeId: { in: [...scope.visibleWbsNodeIds] } },
                ],
              }),
        },
      }),
    ]);

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        projectType: true,
        contractValue: true,
      },
    });

    return {
      metrics: {
        openIncidents,
        openDefects,
        openPunches,
        openRisks,
        pendingMeasurements,
        pendingDaily,
        documentsReview,
        overallProgress: Math.round(progress),
        overdueActivities: health.overdue,
        avgProgress: Math.round(progress),
        projects: 1,
        activeProjects: project?.status === "ACTIVE" ? 1 : 0,
      },
      projects: project
        ? [
            {
              id: project.id,
              code: project.code,
              name: project.name,
              status: project.status,
              projectType: project.projectType,
              contractValue: scope.canViewCostDetail
                ? Number(project.contractValue)
                : undefined,
              progress: Math.round(progress),
              openRisks,
              openIncidents,
            },
          ]
        : [],
      portfolio: [],
      recentActivity: [],
    };
  }

  const result = await getPortfolioDashboard(user);

  const projectsWithStats = result.projects.map((p) => {
    const portfolioItem = result.portfolio.find((pp) => pp.id === p.id);
    return {
      ...p,
      progress: portfolioItem
        ? Math.round(
            (1 -
              portfolioItem.pendingMeasurements /
                Math.max(1, portfolioItem.pendingMeasurements + 10)) *
              100
          )
        : 0,
      openRisks: portfolioItem?.openRisks ?? 0,
      openIncidents: portfolioItem?.openIncidents ?? 0,
    };
  });

  return {
    ...result,
    projects: projectsWithStats,
  };
}
