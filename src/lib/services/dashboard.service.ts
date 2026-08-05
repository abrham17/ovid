import { db } from "@/lib/db";
import type { PartyType, UserRole } from "@/generated/prisma/enums";
import type { DashboardMetricKey } from "@/lib/dashboard/metric-keys";
import { DASHBOARD_METRIC_KEYS } from "@/lib/dashboard/metric-keys";
import { getOrganizationScope } from "@/lib/rbac/organizationScope";
import type { SessionUser } from "@/lib/rbac";
import { aggregateDashboardMetric, getProjectScopedStats } from "@/lib/dashboard/scoped-metrics";

export type MetricKey = DashboardMetricKey;

export type ProjectSnapshot = {
  id: string;
  name: string;
  code: string;
  status: string;
  contractValue: number | null;
  progress: number;
  openRisks: number;
  openIncidents: number;
};

export type DashboardDataPayload = {
  metrics: Record<MetricKey, number>;
  projects: ProjectSnapshot[];
};

async function getVisibleProjects({
  userId,
  organizationId,
  role,
}: {
  userId: string;
  organizationId: string;
  role: UserRole;
}) {
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

  return db.project.findMany({
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
}

/**
 * Backend Data Access Service for Dashboard.
 * Every metric is scope-safe via getOrganizationScope + METRIC_SENSITIVITY.
 */
export async function getDashboardData({
  userId,
  organizationId,
  role,
  partyType: _partyType,
}: {
  userId: string;
  organizationId: string;
  role: UserRole;
  partyType: PartyType;
}): Promise<DashboardDataPayload> {
  void _partyType;

  const user: SessionUser = {
    id: userId,
    role,
    organizationId,
    partyType: _partyType,
    organizationName: "",
    jobTitle: "",
  };

  const projects = await getVisibleProjects({ userId, organizationId, role });

  const scopesByProject = new Map(
    (
      await Promise.all(
        projects.map(async (project) => {
          const scope = await getOrganizationScope(user, project.id);
          return scope ? ([project.id, scope] as const) : null;
        })
      )
    ).filter((entry): entry is [string, NonNullable<typeof entry>[1]] => entry !== null)
  );

  const perProjectStats = await Promise.all(
    projects.map(async (project) => {
      const scope = scopesByProject.get(project.id);
      if (!scope) {
        return {
          projectId: project.id,
          progress: 0,
          openRisks: 0,
          openIncidents: 0,
          contractValue: null,
        };
      }
      const stats = await getProjectScopedStats(project.id, scope);
      return { projectId: project.id, ...stats };
    })
  );

  const statsByProject = new Map(perProjectStats.map((s) => [s.projectId, s]));
  const projectIds = projects.map((p) => p.id);

  const metrics = Object.fromEntries(
    await Promise.all(
      DASHBOARD_METRIC_KEYS.map(async (key) => [
        key,
        await aggregateDashboardMetric(projectIds, scopesByProject, key),
      ])
    )
  ) as Record<MetricKey, number>;

  return {
    metrics,
    projects: projects.map((project) => {
      const stats = statsByProject.get(project.id);
      return {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
        contractValue: stats?.contractValue ?? null,
        progress: stats?.progress ?? 0,
        openRisks: stats?.openRisks ?? 0,
        openIncidents: stats?.openIncidents ?? 0,
      };
    }),
  };
}
