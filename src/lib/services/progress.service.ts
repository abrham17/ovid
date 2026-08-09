import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import {
  computeActivityStatus as _computeActivityStatus,
  computeActivityStatuses as _computeActivityStatuses,
  type ComputedActivityStatus,
  type ActivityStatusInfo,
} from "@/lib/schedule-status";
import {
  getEffectiveScope,
  activityWbsFilter,
  isAll,
  type EffectiveScope,
} from "@/lib/scope";

export type { ComputedActivityStatus, ActivityStatusInfo };

export function computeActivityStatus(
  input: Parameters<typeof _computeActivityStatus>[0]
): ActivityStatusInfo {
  return _computeActivityStatus(input);
}

export function computeActivityStatuses(
  activities: Parameters<typeof _computeActivityStatuses>[0]
): Map<string, ActivityStatusInfo> {
  return _computeActivityStatuses(activities);
}

type WeightedProgress = {
  wbsNodeId: string;
  progressPercent: number;
  weight: number;
};

async function getWbsNodeWeight(wbsNodeId: string): Promise<number> {
  const boqItems = await db.boqItem.findMany({
    where: { wbsNodeId },
    select: { budgetedQuantity: true, unitRate: true },
  });
  if (boqItems.length === 0) return 1;
  const total = boqItems.reduce(
    (sum, item) => sum + Number(item.budgetedQuantity) * Number(item.unitRate),
    0
  );
  return Math.max(total, 1);
}

function nodeInScope(scope: EffectiveScope | null, wbsNodeId: string): boolean {
  if (!scope || isAll(scope.visibleWbsNodeIds)) return true;
  return scope.visibleWbsNodeIds.has(wbsNodeId);
}

export async function computeActivityProgress(activityId: string): Promise<number> {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: activityId },
    select: { progressPercent: true },
  });
  if (!activity) throw new Error("Activity not found");
  return Number(activity.progressPercent);
}

export async function computeWbsProgress(
  wbsNodeId: string,
  user?: SessionUser,
  scope?: EffectiveScope | null
): Promise<number> {
  let effectiveScope = scope ?? null;
  if (user && !effectiveScope) {
    const node = await db.wbsNode.findUniqueOrThrow({
      where: { id: wbsNodeId },
      select: { projectId: true },
    });
    await assertProjectAccess(user, node.projectId);
    assertPermission(user, "wbs", "read");
    effectiveScope = await getEffectiveScope(user, node.projectId);
  }

  if (effectiveScope && !nodeInScope(effectiveScope, wbsNodeId)) {
    return 0;
  }

  const [children, activities] = await Promise.all([
    db.wbsNode.findMany({
      where: { parentId: wbsNodeId },
      select: { id: true },
    }),
    db.scheduleActivity.findMany({
      where: { wbsNodeId },
      select: { id: true, progressPercent: true },
    }),
  ]);

  const scopedChildren = children.filter((c) => nodeInScope(effectiveScope, c.id));

  if (scopedChildren.length === 0 && activities.length === 0) return 0;

  const childProgresses: WeightedProgress[] = [];
  for (const child of scopedChildren) {
    const progress = await computeWbsProgress(child.id, user, effectiveScope);
    const weight = await getWbsNodeWeight(child.id);
    childProgresses.push({ wbsNodeId: child.id, progressPercent: progress, weight });
  }

  const activityEntries: WeightedProgress[] = activities.map((a) => ({
    wbsNodeId: a.id,
    progressPercent: Number(a.progressPercent),
    weight: 1,
  }));

  const allEntries =
    childProgresses.length > 0 && activityEntries.length > 0
      ? [...childProgresses, ...activityEntries]
      : childProgresses.length > 0
        ? childProgresses
        : activityEntries;

  const totalWeight = allEntries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = allEntries.reduce((sum, e) => sum + e.progressPercent * e.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export async function computeProjectProgress(
  projectId: string,
  user?: SessionUser
): Promise<number> {
  let scope: EffectiveScope | null = null;
  if (user) {
    await assertProjectAccess(user, projectId);
    assertPermission(user, "project", "read");
    scope = await getEffectiveScope(user, projectId);
  }

  if (scope && !isAll(scope.visibleWbsNodeIds)) {
    const ids = [...scope.visibleWbsNodeIds];
    if (ids.length === 0) return 0;
    const activities = await db.scheduleActivity.findMany({
      where: { wbsNodeId: { in: ids } },
      select: { progressPercent: true },
    });
    if (activities.length === 0) return 0;
    const sum = activities.reduce((s, a) => s + Number(a.progressPercent), 0);
    return Math.round((sum / activities.length) * 100) / 100;
  }

  const rootNodes = await db.wbsNode.findMany({
    where: { projectId, parentId: null },
    select: { id: true },
  });

  if (rootNodes.length === 0) return 0;

  const progresses: WeightedProgress[] = [];
  for (const node of rootNodes) {
    const progress = await computeWbsProgress(node.id, user, scope);
    const weight = await getWbsNodeWeight(node.id);
    progresses.push({ wbsNodeId: node.id, progressPercent: progress, weight });
  }

  const totalWeight = progresses.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = progresses.reduce((sum, e) => sum + e.progressPercent * e.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export type ProjectHealthSummary = {
  totalActivities: number;
  overdue: number;
  dueSoon: number;
  inProgress: number;
  notStarted: number;
  complete: number;
  onHold: number;
  overallProgress: number;
};

export async function getProjectHealth(
  projectId: string,
  user?: SessionUser
): Promise<ProjectHealthSummary> {
  let scope: EffectiveScope | null = null;
  if (user) {
    await assertProjectAccess(user, projectId);
    assertPermission(user, "project", "read");
    scope = await getEffectiveScope(user, projectId);
  }

  const wbsFilter = scope ? activityWbsFilter(scope.visibleWbsNodeIds) : {};

  const activities = await db.scheduleActivity.findMany({
    where: { wbsNode: { projectId }, ...wbsFilter },
    select: {
      id: true,
      plannedStart: true,
      plannedFinish: true,
      actualStart: true,
      actualFinish: true,
      progressPercent: true,
      status: true,
    },
  });

  const statuses = computeActivityStatuses(
    activities.map((a) => ({
      ...a,
      progressPercent: Number(a.progressPercent),
    }))
  );

  let overdue = 0;
  let dueSoon = 0;
  let inProgress = 0;
  let notStarted = 0;
  let complete = 0;
  let onHold = 0;

  for (const [, info] of statuses) {
    switch (info.status) {
      case "OVERDUE": overdue++; break;
      case "DUE_SOON": dueSoon++; break;
      case "IN_PROGRESS":
      case "ON_TRACK": inProgress++; break;
      case "NOT_STARTED": notStarted++; break;
      case "COMPLETE": complete++; break;
      case "ON_HOLD": onHold++; break;
    }
  }

  const overallProgress = await computeProjectProgress(projectId, user);

  return {
    totalActivities: activities.length,
    overdue,
    dueSoon,
    inProgress,
    notStarted,
    complete,
    onHold,
    overallProgress,
  };
}
