export type CriticalPathActivity = {
  id: string;
  plannedStart: Date;
  plannedFinish: Date;
  successors: { successorId: string; lagDays: number }[];
};

const dayMs = 86_400_000;
const durationDays = (activity: CriticalPathActivity) => Math.max(1, Math.ceil((activity.plannedFinish.getTime() - activity.plannedStart.getTime()) / dayMs));

/** Calculate zero-float activities with a CPM forward/backward pass. */
export function calculateCriticalActivityIds(activities: CriticalPathActivity[]) {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const predecessorCount = new Map(activities.map((activity) => [activity.id, 0]));
  for (const activity of activities) for (const edge of activity.successors) if (byId.has(edge.successorId)) predecessorCount.set(edge.successorId, (predecessorCount.get(edge.successorId) ?? 0) + 1);
  const queue = activities.filter((activity) => predecessorCount.get(activity.id) === 0).map((activity) => activity.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of byId.get(id)?.successors ?? []) {
      if (!byId.has(edge.successorId)) continue;
      const count = (predecessorCount.get(edge.successorId) ?? 1) - 1;
      predecessorCount.set(edge.successorId, count);
      if (count === 0) queue.push(edge.successorId);
    }
  }
  if (order.length !== activities.length) return new Set<string>();
  const earliestStart = new Map(activities.map((activity) => [activity.id, 0]));
  for (const id of order) {
    const activity = byId.get(id)!;
    const finish = (earliestStart.get(id) ?? 0) + durationDays(activity);
    for (const edge of activity.successors) earliestStart.set(edge.successorId, Math.max(earliestStart.get(edge.successorId) ?? 0, finish + edge.lagDays));
  }
  const projectDuration = Math.max(0, ...activities.map((activity) => (earliestStart.get(activity.id) ?? 0) + durationDays(activity)));
  const latestFinish = new Map(activities.map((activity) => [activity.id, projectDuration]));
  for (const id of [...order].reverse()) {
    const activity = byId.get(id)!;
    if (activity.successors.length) latestFinish.set(id, Math.min(...activity.successors.filter((edge) => byId.has(edge.successorId)).map((edge) => (latestFinish.get(edge.successorId) ?? projectDuration) - durationDays(byId.get(edge.successorId)!) - edge.lagDays)));
  }
  return new Set(activities.filter((activity) => Math.abs(((latestFinish.get(activity.id) ?? projectDuration) - durationDays(activity)) - (earliestStart.get(activity.id) ?? 0)) < 0.001).map((activity) => activity.id));
}

export function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : null;
}
