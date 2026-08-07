/**
 * Pure (no DB) schedule status computation.
 * Can be safely imported in client components.
 */

// ── Computed Status ─────────────────────────────────────────────────

export type ComputedActivityStatus =
  | "NOT_STARTED"
  | "DUE_SOON"
  | "IN_PROGRESS"
  | "ON_TRACK"
  | "OVERDUE"
  | "COMPLETE"
  | "ON_HOLD";

export type ActivityStatusInfo = {
  status: ComputedActivityStatus;
  /** Days until planned start (negative = started) */
  daysUntilStart: number;
  /** Days until planned finish (negative = overdue) */
  daysUntilFinish: number;
  /** Whether the activity is overdue */
  isOverdue: boolean;
};

/**
 * Compute the operational status of an activity based on its dates and progress.
 * Pure function — no database calls. Safe to use in client components.
 */
export function computeActivityStatus(input: {
  plannedStart: Date;
  plannedFinish: Date;
  actualStart?: Date | null;
  actualFinish?: Date | null;
  progressPercent: number;
  status: string;
}): ActivityStatusInfo {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(input.plannedStart);
  const finish = new Date(input.plannedFinish);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilStart = Math.round((start.getTime() - today.getTime()) / msPerDay);
  const daysUntilFinish = Math.round((finish.getTime() - today.getTime()) / msPerDay);

  if (input.progressPercent >= 100 || input.status === "COMPLETE" || input.actualFinish) {
    return { status: "COMPLETE", daysUntilStart, daysUntilFinish, isOverdue: false };
  }
  if (input.status === "ON_HOLD") {
    return { status: "ON_HOLD", daysUntilStart, daysUntilFinish, isOverdue: false };
  }

  const hasStarted = input.actualStart != null || input.progressPercent > 0 || input.status === "IN_PROGRESS";

  if (daysUntilFinish < 0) {
    return { status: "OVERDUE", daysUntilStart, daysUntilFinish, isOverdue: true };
  }
  if (!hasStarted && daysUntilStart <= 7 && daysUntilStart >= 0) {
    return { status: "DUE_SOON", daysUntilStart, daysUntilFinish, isOverdue: false };
  }
  if (!hasStarted) {
    return { status: "NOT_STARTED", daysUntilStart, daysUntilFinish, isOverdue: false };
  }
  if (daysUntilFinish >= 0) {
    return { status: "IN_PROGRESS", daysUntilStart, daysUntilFinish, isOverdue: false };
  }
  return { status: "ON_TRACK", daysUntilStart, daysUntilFinish, isOverdue: false };
}

/**
 * Compute status for multiple activities at once.
 */
export function computeActivityStatuses(
  activities: Array<{
    id: string;
    plannedStart: Date;
    plannedFinish: Date;
    actualStart?: Date | null;
    actualFinish?: Date | null;
    progressPercent: number;
    status: string;
  }>
): Map<string, ActivityStatusInfo> {
  const results = new Map<string, ActivityStatusInfo>();
  for (const a of activities) {
    results.set(a.id, computeActivityStatus({
      plannedStart: a.plannedStart,
      plannedFinish: a.plannedFinish,
      actualStart: a.actualStart,
      actualFinish: a.actualFinish,
      progressPercent: a.progressPercent,
      status: a.status,
    }));
  }
  return results;
}