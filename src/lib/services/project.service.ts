import { db } from "@/lib/db";
import { getProjectParty, getWorkspaceTabs, type SessionUser, type WorkspaceTab } from "@/lib/rbac";
import type { PartyType, ProjectType, ContractType, ProjectStatus, UserRole } from "@/generated/prisma/enums";

export type ProjectHeaderData = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  projectType: ProjectType;
  contractType: ContractType;
  contractValue: unknown;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
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

  return {
    ...project,
    userParty: party,
    userRole: user.role,
    allowedTabs: [...allowedTabs],
  };
}

/**
 * Fetches aggregate data for the Project Overview Tab.
 */
export async function getProjectOverviewDetails(
  user: SessionUser,
  projectId: string
): Promise<ProjectOverviewStats> {
  const [
    wbsCount,
    activityCount,
    activityProgress,
    openRisks,
    openIncidents,
    pendingEarthwork,
    pendingStructure,
    pendingRebar,
    measurementCount,
    certifiedPaymentsCount,
    equipmentCount,
    documentCount,
    recentStoppages,
  ] = await Promise.all([
    db.wbsNode.count({ where: { projectId } }),
    db.scheduleActivity.count({ where: { wbsNode: { projectId } } }),
    db.scheduleActivity.aggregate({
      _avg: { progressPercent: true },
      where: { wbsNode: { projectId } },
    }),
    db.riskEntry.count({ where: { projectId, status: { in: ["OPEN", "MITIGATING"] } } }),
    db.safetyIncident.count({ where: { wbsNode: { projectId }, status: { not: "CLOSED" } } }),
    db.earthworkDailyEntry.count({ where: { projectId, status: "SUBMITTED" } }),
    db.structureDailyEntry.count({ where: { projectId, status: "SUBMITTED" } }),
    db.rebarDailyEntry.count({ where: { projectId, status: "SUBMITTED" } }),
    db.measurementEntry.count({ where: { wbsNode: { projectId } } }),
    db.measurementEntry.count({ where: { wbsNode: { projectId }, status: "CERTIFIED" } }),
    db.equipmentUsageLog.count({ where: { projectId } }),
    db.projectDocument.count({ where: { projectId } }),
    db.stoppageEntry.findMany({
      where: { projectId },
      orderBy: { startTime: "desc" },
      take: 5,
      select: {
        id: true,
        stoppageType: true,
        reason: true,
        startTime: true,
        endTime: true,
      },
    }),
  ]);

  return {
    wbsCount,
    activityCount,
    avgProgress: Math.round(Number(activityProgress._avg.progressPercent ?? 0)),
    openRisks,
    openIncidents,
    pendingDailyReports: pendingEarthwork + pendingStructure + pendingRebar,
    measurementCount,
    certifiedPaymentsCount,
    equipmentCount,
    documentCount,
    recentStoppages,
  };
}
