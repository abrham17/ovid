export interface CpmActivity {
  id: string;
  durationDays: number;
  predecessorIds: string[];
}

export interface CpmResult {
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

export function solveCriticalPath(
  activities: CpmActivity[]
): Map<string, CpmResult> {
  const result = new Map<string, CpmResult>();
  if (activities.length === 0) return result;

  const activityMap = new Map<string, CpmActivity>();
  const successorsMap = new Map<string, string[]>();

  for (const act of activities) {
    activityMap.set(act.id, act);
    successorsMap.set(act.id, []);
  }

  for (const act of activities) {
    for (const predId of act.predecessorIds) {
      if (successorsMap.has(predId)) {
        successorsMap.get(predId)!.push(act.id);
      }
    }
  }

  // Topological Sort for forward pass safety
  const sorted: CpmActivity[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // skip cycles
    visiting.add(id);

    const act = activityMap.get(id);
    if (act) {
      for (const predId of act.predecessorIds) {
        visit(predId);
      }
      visited.add(id);
      sorted.push(act);
    }
    visiting.delete(id);
  }

  for (const act of activities) {
    visit(act.id);
  }

  // Forward Pass: ES, EF
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const act of sorted) {
    let maxES = 0;
    for (const predId of act.predecessorIds) {
      const predEF = earlyFinish.get(predId) ?? 0;
      if (predEF > maxES) maxES = predEF;
    }
    earlyStart.set(act.id, maxES);
    earlyFinish.set(act.id, maxES + act.durationDays);
  }

  const projectDuration = Math.max(...Array.from(earlyFinish.values()), 0);

  // Backward Pass: LS, LF using topologically sorted array in reverse order
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  for (let i = sorted.length - 1; i >= 0; i--) {
    const act = sorted[i];
    const succs = successorsMap.get(act.id) ?? [];
    let minLS = projectDuration;

    if (succs.length > 0) {
      minLS = Math.min(
        ...succs.map((succId) => lateStart.get(succId) ?? projectDuration)
      );
    }

    lateFinish.set(act.id, minLS);
    lateStart.set(act.id, minLS - act.durationDays);
  }

  // Calculate Floats and Critical Path
  for (const act of activities) {
    const es = earlyStart.get(act.id) ?? 0;
    const ef = earlyFinish.get(act.id) ?? 0;
    const ls = lateStart.get(act.id) ?? 0;
    const lf = lateFinish.get(act.id) ?? 0;

    const totalFloat = ls - es;

    const succs = successorsMap.get(act.id) ?? [];
    let minSuccES = projectDuration;
    if (succs.length > 0) {
      minSuccES = Math.min(
        ...succs.map((succId) => earlyStart.get(succId) ?? projectDuration)
      );
    } else {
      minSuccES = projectDuration;
    }
    const freeFloat = minSuccES - ef;

    result.set(act.id, {
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      freeFloat,
      isCritical: totalFloat <= 0,
    });
  }

  return result;
}
