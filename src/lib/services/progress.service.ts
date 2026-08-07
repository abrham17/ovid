import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import {
  computeActivityStatus as _computeActivityStatus,
  computeActivityStatuses as _computeActivityStatuses,
  type ComputedActivityStatus,
  type ActivityStatusInfo,
} from "@/lib/schedule-status";

// Re-export types and pure functions for both server and client consumers
export type { ComputedActivityStatus, ActivityStatusInfo };

/**
 * Pure-status computation — delegates to @/lib/schedule-status.
 * This function is safe to import in client components.
 */
export function computeActivityStatus(
  input: Parameters<typeof _computeActivityStatus>[0]
): ActivityStatusInfo {
  return _computeActivityStatus(input);
}

/**
 * Batch version.
 */
export function computeActivityStatuses(
  activities: Parameters<typeof _computeActivityStatuses>[0]
): Map<string, ActivityStatusInfo> {
  return _computeActivityStatuses(activities);
}

// ── Progress Rollup ──────────────────────────────────────────────────

type WeightedProgress = {
  wbsNodeId: string;
  progressPercent: number;
  weight: number;
};

/**
 * Get the budget-based weight for a WBS node (sum of BOQ item budgetedQty × unitRate).
 * Returns 1 as minimum to avoid division by zero.
 */
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

/**
 * Compute the progress of a ScheduleActivity.
 * Uses the existing progressPercent field (which can be set programmatically via
 * daily report verified quantities).
 */
export async function computeActivityProgress(activityId: string): Promise<number> {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: activityId },
    select: { progressPercent: true },
  });
  if (!activity) throw new Error("Activity not found");
  return Number(activity.progressPercent);
}

/**
 * Compute WBS node progress as weighted average of its child WBS nodes
 * and/or direct ScheduleActivities.
 *
 * If the node has child WBS nodes → recurse and weight them.
 * If the node has direct activities → average their progress.
 * Falls back to the mean of both if both exist.
 */
export async function computeWbsProgress(
  wbsNodeId: string,
  user?: SessionUser
): Promise<number> {
  if (user) {
    const node = await db.wbsNode.findUniqueOrThrow({ where: { id: wbsNodeId }, select: { projectId: true } });
    await assertProjectAccess(user, node.projectId);
    assertPermission(user, "wbs", "read");
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

  // If no children and no activities, progress is 0
  if (children.length === 0 && activities.length === 0) return 0;

  // Recurse into child WBS nodes
  const childProgresses: WeightedProgress[] = [];
  for (const child of children) {
    const progress = await computeWbsProgress(child.id, user);
    const weight = await getWbsNodeWeight(child.id);
    childProgresses.push({ wbsNodeId: child.id, progressPercent: progress, weight });
  }

  // Direct activities
  const activityEntries: WeightedProgress[] = activities.map((a) => ({
    wbsNodeId: a.id,
    progressPercent: Number(a.progressPercent),
    weight: 1,
  }));

  const allEntries = childProgresses.length > 0 && activityEntries.length > 0
    ? [...childProgresses, ...activityEntries]
    : childProgresses.length > 0
      ? childProgresses
      : activityEntries;

  const totalWeight = allEntries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = allEntries.reduce((sum, e) => sum + e.progressPercent * e.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Compute overall project progress as weighted average of top-level WBS nodes.
 * Top-level WBS nodes are those without a parentId.
 */
export async function computeProjectProgress(
  projectId: string,
  user?: SessionUser
): Promise<number> {
  if (user) {
    await assertProjectAccess(user, projectId);
    assertPermission(user, "project", "read");
  }

  const rootNodes = await db.wbsNode.findMany({
    where: { projectId, parentId: null },
    select: { id: true },
  });

  if (rootNodes.length === 0) return 0;

  const progresses: WeightedProgress[] = [];
  for (const node of rootNodes) {
    const progress = await computeWbsProgress(node.id, user);
    const weight = await getWbsNodeWeight(node.id);
    progresses.push({ wbsNodeId: node.id, progressPercent: progress, weight });
  }

  const totalWeight = progresses.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = progresses.reduce((sum, e) => sum + e.progressPercent * e.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// ── Dashboard Aggregations ───────────────────────────────────────────

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

/**
 * Compute a health summary for dashboard display.
 * Returns counts of activities in each computed status bucket plus overall progress.
 */
export async function getProjectHealth(
  projectId: string,
  user?: SessionUser
): Promise<ProjectHealthSummary> {
  if (user) {
    await assertProjectAccess(user, projectId);
    assertPermission(user, "project", "read");
  }

  const activities = await db.scheduleActivity.findMany({
    where: { wbsNode: { projectId } },
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