import { db } from "@/lib/db";
import {
  getProjectParty,
  canApproveScheduleBaseline,
  canFlagActivityBlocked,
  canRecordStoppage,
  type SessionUser,
} from "@/lib/rbac";
import { getOrganizationScope } from "@/lib/rbac/organizationScope";
import { wbsNodeIdFilter, wbsRelationFilter } from "@/lib/dashboard/scoped-query";
import type { ActivityStatus, DependencyType, StoppageType } from "@/generated/prisma/enums";

export type ScheduleActivityItem = {
  id: string;
  wbsNodeId: string;
  wbsCode: string;
  wbsName: string;
  name: string;
  baselineStart: string;
  baselineFinish: string;
  plannedStart: string;
  plannedFinish: string;
  actualStart: string | null;
  actualFinish: string | null;
  progressPercent: number;
  status: ActivityStatus;
  predecessorCount: number;
  successorCount: number;
};

export type ScheduleDependencyItem = {
  id: string;
  predecessorId: string;
  predecessorName: string;
  successorId: string;
  successorName: string;
  dependencyType: DependencyType;
  lagDays: number;
};

export type StoppageItem = {
  id: string;
  wbsNodeId: string | null;
  wbsCode: string | null;
  scheduleActivityId: string | null;
  activityName: string | null;
  stoppageType: StoppageType;
  reason: string;
  stationFrom: string | null;
  stationTo: string | null;
  startTime: string;
  endTime: string;
  durationHours: number;
};

export type ScheduleWorkspaceData = {
  projectId: string;
  activities: ScheduleActivityItem[];
  dependencies: ScheduleDependencyItem[];
  stoppages: StoppageItem[];
  wbsNodes: Array<{ id: string; code: string; name: string }>;
  stats: {
    totalActivities: number;
    completedCount: number;
    inProgressCount: number;
    blockedCount: number;
    notStartedCount: number;
    avgProgress: number;
    totalStoppageEvents: number;
    totalStoppageHours: number;
  };
  permissions: {
    canEditSchedule: boolean;
    canApproveBaseline: boolean;
    canFlagBlocked: boolean;
    canRecordStoppage: boolean;
  };
};

export async function getScheduleWorkspaceData(
  user: SessionUser,
  projectId: string
): Promise<ScheduleWorkspaceData | null> {
  const party = await getProjectParty(user, projectId);
  if (!party) return null;

  const scope = await getOrganizationScope(user, projectId);
  if (!scope) return null;

  const wbsRelFilter = wbsRelationFilter(scope, "OPERATIONAL");

  // Fetch activities
  const activitiesRaw = await db.scheduleActivity.findMany({
    where: {
      wbsNode: {
        projectId,
        ...wbsRelFilter.wbsNode,
      },
    },
    include: {
      wbsNode: { select: { code: true, name: true } },
      predecessors: { select: { id: true } },
      successors: { select: { id: true } },
    },
    orderBy: { plannedStart: "asc" },
  });

  const activityIds = new Set(activitiesRaw.map((a) => a.id));

  // Fetch dependencies for visible activities
  const dependenciesRaw = await db.scheduleDependency.findMany({
    where: {
      OR: [
        { predecessorId: { in: Array.from(activityIds) } },
        { successorId: { in: Array.from(activityIds) } },
      ],
    },
    include: {
      predecessor: { select: { name: true } },
      successor: { select: { name: true } },
    },
  });

  // Fetch stoppages
  const stoppagesRaw = await db.stoppageEntry.findMany({
    where: { projectId },
    include: {
      wbsNode: { select: { code: true } },
      scheduleActivity: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  // Fetch WBS nodes for selection dropdowns
  const wbsWhere = wbsNodeIdFilter(scope, "OPERATIONAL");
  const wbsNodesRaw = await db.wbsNode.findMany({
    where: { projectId, ...wbsWhere },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  // Map activities
  const activities: ScheduleActivityItem[] = activitiesRaw.map((a) => ({
    id: a.id,
    wbsNodeId: a.wbsNodeId,
    wbsCode: a.wbsNode.code,
    wbsName: a.wbsNode.name,
    name: a.name,
    baselineStart: a.baselineStart.toISOString(),
    baselineFinish: a.baselineFinish.toISOString(),
    plannedStart: a.plannedStart.toISOString(),
    plannedFinish: a.plannedFinish.toISOString(),
    actualStart: a.actualStart?.toISOString() ?? null,
    actualFinish: a.actualFinish?.toISOString() ?? null,
    progressPercent: Number(a.progressPercent),
    status: a.status,
    predecessorCount: a.predecessors.length,
    successorCount: a.successors.length,
  }));

  // Map dependencies
  const dependencies: ScheduleDependencyItem[] = dependenciesRaw.map((d) => ({
    id: d.id,
    predecessorId: d.predecessorId,
    predecessorName: d.predecessor.name,
    successorId: d.successorId,
    successorName: d.successor.name,
    dependencyType: d.dependencyType,
    lagDays: d.lagDays,
  }));

  // Map stoppages
  const stoppages: StoppageItem[] = stoppagesRaw.map((s) => {
    const startMs = new Date(s.startTime).getTime();
    const endMs = new Date(s.endTime).getTime();
    const durationHours = Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60)));

    return {
      id: s.id,
      wbsNodeId: s.wbsNodeId,
      wbsCode: s.wbsNode?.code ?? null,
      scheduleActivityId: s.scheduleActivityId,
      activityName: s.scheduleActivity?.name ?? null,
      stoppageType: s.stoppageType,
      reason: s.reason,
      stationFrom: s.stationFrom,
      stationTo: s.stationTo,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      durationHours,
    };
  });

  // Calculate statistics
  const totalActivities = activities.length;
  const completedCount = activities.filter((a) => a.status === "COMPLETE").length;
  const inProgressCount = activities.filter((a) => a.status === "IN_PROGRESS").length;
  const blockedCount = activities.filter((a) => a.status === "ON_HOLD").length;
  const notStartedCount = activities.filter((a) => a.status === "NOT_STARTED").length;

  const totalProgressSum = activities.reduce((acc, a) => acc + a.progressPercent, 0);
  const avgProgress = totalActivities > 0 ? Math.round(totalProgressSum / totalActivities) : 0;

  const totalStoppageEvents = stoppages.length;
  const totalStoppageHours = stoppages.reduce((acc, s) => acc + s.durationHours, 0);

  const canEditSchedule =
    party.partyType === "CONTRACTOR" || party.partyType === "SUBCONTRACTOR";

  return {
    projectId,
    activities,
    dependencies,
    stoppages,
    wbsNodes: wbsNodesRaw,
    stats: {
      totalActivities,
      completedCount,
      inProgressCount,
      blockedCount,
      notStartedCount,
      avgProgress,
      totalStoppageEvents,
      totalStoppageHours,
    },
    permissions: {
      canEditSchedule,
      canApproveBaseline: canApproveScheduleBaseline(user.role),
      canFlagBlocked: canFlagActivityBlocked(user.role),
      canRecordStoppage: canRecordStoppage(user.role),
    },
  };
}
