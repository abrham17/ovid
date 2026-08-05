import { db } from "@/lib/db";
import { getProjectParty, getWorkspaceTabs, type SessionUser, type WorkspaceTab } from "@/lib/rbac";
import { getOrganizationScope } from "@/lib/rbac/organizationScope";
import { buildScopeBanner, isVisible, resolveContractValue } from "@/lib/dashboard/scoped-query";
import {
  countActivities,
  countCertifiedPaymentsOverview,
  countDocuments,
  countEquipmentLogs,
  countOpenIncidents,
  countOpenRisks,
  countOverviewMeasurements,
  countPendingDaily,
  countWbsNodes,
  getAvgProgress,
  getRecentStoppages,
} from "@/lib/dashboard/scoped-metrics";
import type { PartyType, ProjectType, ContractType, ProjectStatus, UserRole } from "@/generated/prisma/enums";

export type ProjectHeaderData = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  projectType: ProjectType;
  contractType: ContractType;
  contractValue: number | null;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  contractorOrg: { id: string; name: string; contractorGrade: string | null };
  clientOrg: { id: string; name: string };
  consultantOrg: { id: string; name: string } | null;
  userParty: {
    organizationId: string;
    partyType: PartyType;
    projectRole: string;
  };
  userRole: UserRole;
  allowedTabs: WorkspaceTab[];
};

export type ProjectOverviewStats = {
  scopeBanner: string | null;
  showOperationalMetrics: boolean;
  showCommercialMetrics: boolean;
  wbsCount: number;
  activityCount: number;
  avgProgress: number;
  openRisks: number;
  openIncidents: number;
  pendingDailyReports: number;
  measurementCount: number;
  certifiedPaymentsCount: number;
  equipmentCount: number;
  documentCount: number;
  recentStoppages: Array<{
    id: string;
    stoppageType: string;
    reason: string;
    startTime: Date;
    endTime: Date;
  }>;
};

/**
 * Backend Data Access Service for Project Workspaces.
 * Verifies Layer-1 party authorization and provides project data & tab lists.
 */
export async function getProjectWorkspaceHeader(
  user: SessionUser,
  projectId: string
): Promise<ProjectHeaderData | null> {
  const party = await getProjectParty(user, projectId);
  if (!party) return null;

  const scope = await getOrganizationScope(user, projectId);
  if (!scope) return null;

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      projectType: true,
      contractType: true,
      contractValue: true,
      plannedStartDate: true,
      plannedEndDate: true,
      actualStartDate: true,
      actualEndDate: true,
      contractorOrg: { select: { id: true, name: true, contractorGrade: true } },
      clientOrg: { select: { id: true, name: true } },
      consultantOrg: { select: { id: true, name: true } },
    },
  });

  if (!project) return null;

  const allowedTabs = getWorkspaceTabs(party.partyType, user.role);
  const contractValue = await resolveContractValue(scope, project);

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    status: project.status,
    projectType: project.projectType,
    contractType: project.contractType,
    contractValue,
    plannedStartDate: project.plannedStartDate.toISOString(),
    plannedEndDate: project.plannedEndDate.toISOString(),
    actualStartDate: project.actualStartDate?.toISOString() ?? null,
    actualEndDate: project.actualEndDate?.toISOString() ?? null,
    contractorOrg: project.contractorOrg,
    clientOrg: project.clientOrg,
    consultantOrg: project.consultantOrg,
    userParty: party,
    userRole: user.role,
    allowedTabs: [...allowedTabs],
  };
}

/**
 * Fetches scope-safe aggregate data for the Project Overview Tab.
 */
export async function getProjectOverviewDetails(
  user: SessionUser,
  projectId: string
): Promise<ProjectOverviewStats> {
  const scope = await getOrganizationScope(user, projectId);
  if (!scope) {
    return {
      scopeBanner: null,
      showOperationalMetrics: false,
      showCommercialMetrics: false,
      wbsCount: 0,
      activityCount: 0,
      avgProgress: 0,
      openRisks: 0,
      openIncidents: 0,
      pendingDailyReports: 0,
      measurementCount: 0,
      certifiedPaymentsCount: 0,
      equipmentCount: 0,
      documentCount: 0,
      recentStoppages: [],
    };
  }

  const [
    wbsCount,
    activityCount,
    avgProgress,
    openRisks,
    openIncidents,
    pendingDailyReports,
    measurementCount,
    certifiedPaymentsCount,
    equipmentCount,
    documentCount,
    recentStoppages,
  ] = await Promise.all([
    countWbsNodes(projectId, scope),
    countActivities(projectId, scope),
    getAvgProgress(projectId, scope),
    countOpenRisks(projectId, scope),
    countOpenIncidents(projectId, scope),
    countPendingDaily(projectId, scope),
    countOverviewMeasurements(projectId, scope),
    countCertifiedPaymentsOverview(projectId, scope),
    countEquipmentLogs(projectId, scope),
    countDocuments(projectId, scope),
    getRecentStoppages(projectId, scope),
  ]);

  return {
    scopeBanner: buildScopeBanner(scope),
    showOperationalMetrics: isVisible(scope, "pendingDailyReports"),
    showCommercialMetrics: isVisible(scope, "measurementCount"),
    wbsCount,
    activityCount,
    avgProgress,
    openRisks,
    openIncidents,
    pendingDailyReports,
    measurementCount,
    certifiedPaymentsCount,
    equipmentCount,
    documentCount,
    recentStoppages,
  };
}
