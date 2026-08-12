import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import {
  computeActivityStatus as _computeActivityStatus,
  computeActivityStatuses as _computeActivityStatuses,
  type ComputedActivityStatus,
  type ActivityStatusInfo,
} from "@/lib/schedule-status";
import { resolveSiblingWeights } from "@/lib/weight-math";
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

// ── Weighted rollup (file 20 §2.3) ──────────────────────────────────
//
// Progress is computed bottom-up and never hand-typed above a leaf activity:
//
//   node with WBS children      → Σ (child.weight/100 × child.progress)
//   node with only activities   → Σ (activity.weight/100 × activity.progress)
//   project completion          → root node's progress
//
// Weight comes from the explicit, PM-assigned weightPercent rather than a
// BoQ-derived cost weight: completion-weight and cost-weight are not the same
// judgement, and the PM owns the former (file 20 §2.1).

type TreeNode = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  status: string;
  weightPercent: number | null;
  childIds: string[];
};

type TreeActivity = {
  id: string;
  wbsNodeId: string;
  progressPercent: number;
  weightPercent: number | null;
  status: string;
  plannedStart: Date;
  plannedFinish: Date;
  actualStart: Date | null;
  actualFinish: Date | null;
};

export type ProgressTree = {
  projectId: string;
  nodes: Map<string, TreeNode>;
  rootIds: string[];
  activitiesByNode: Map<string, TreeActivity[]>;
  /** WBS nodes whose most recent inspection passed (see qualityClearedNodeIds). */
  qualityClearedNodeIds: Set<string>;
};

/**
 * Load the whole project's progress tree in a fixed number of queries.
 * The previous implementation recursed with a query per node per level, which
 * made every Overview render O(nodes) round-trips.
 */
export async function loadProgressTree(projectId: string): Promise<ProgressTree> {
  const [nodeRows, activityRows, itrRows] = await Promise.all([
    db.wbsNode.findMany({
      where: { projectId },
      select: {
        id: true,
        parentId: true,
        code: true,
        name: true,
        status: true,
        weightPercent: true,
      },
    }),
    db.scheduleActivity.findMany({
      where: { wbsNode: { projectId } },
      select: {
        id: true,
        wbsNodeId: true,
        progressPercent: true,
        weightPercent: true,
        status: true,
        plannedStart: true,
        plannedFinish: true,
        actualStart: true,
        actualFinish: true,
      },
    }),
    db.inspectionTestRecord.findMany({
      where: { wbsNode: { projectId } },
      select: { wbsNodeId: true, result: true, inspectedAt: true },
      orderBy: { inspectedAt: "asc" },
    }),
  ]);

  const nodes = new Map<string, TreeNode>();
  for (const n of nodeRows) {
    nodes.set(n.id, {
      id: n.id,
      parentId: n.parentId,
      code: n.code,
      name: n.name,
      status: String(n.status),
      weightPercent: n.weightPercent == null ? null : Number(n.weightPercent),
      childIds: [],
    });
  }
  const rootIds: string[] = [];
  for (const n of nodeRows) {
    if (n.parentId && nodes.has(n.parentId)) {
      nodes.get(n.parentId)!.childIds.push(n.id);
    } else {
      rootIds.push(n.id);
    }
  }

  const activitiesByNode = new Map<string, TreeActivity[]>();
  for (const a of activityRows) {
    const list = activitiesByNode.get(a.wbsNodeId) ?? [];
    list.push({
      id: a.id,
      wbsNodeId: a.wbsNodeId,
      progressPercent: Number(a.progressPercent),
      weightPercent: a.weightPercent == null ? null : Number(a.weightPercent),
      status: String(a.status),
      plannedStart: a.plannedStart,
      plannedFinish: a.plannedFinish,
      actualStart: a.actualStart,
      actualFinish: a.actualFinish,
    });
    activitiesByNode.set(a.wbsNodeId, list);
  }

  // A node is quality-cleared when its most recent inspection passed. Rows are
  // loaded oldest-first, so the last write per node wins — a later FAIL
  // correctly un-clears a node that had previously passed.
  const qualityClearedNodeIds = new Set<string>();
  for (const itr of itrRows) {
    const cleared = itr.result === "PASS" || itr.result === "CONDITIONAL_PASS";
    if (cleared) qualityClearedNodeIds.add(itr.wbsNodeId);
    else qualityClearedNodeIds.delete(itr.wbsNodeId);
  }

  return { projectId, nodes, rootIds, activitiesByNode, qualityClearedNodeIds };
}

export type ProgressMode = "physical" | "quality_cleared";

type RollupOptions = {
  /** Visible WBS ids; nodes outside it are dropped from their parent's sibling set. */
  visible?: Set<string> | "ALL";
  mode?: ProgressMode;
  /** Include DRAFT nodes. Off by default — a draft plan must not move live numbers. */
  includeDraft?: boolean;
};

function nodeIncluded(
  tree: ProgressTree,
  nodeId: string,
  opts: RollupOptions
): boolean {
  const node = tree.nodes.get(nodeId);
  if (!node) return false;
  if (!opts.includeDraft && node.status === "DRAFT") return false;
  if (node.status === "ARCHIVED") return false;
  const visible = opts.visible ?? "ALL";
  if (visible !== "ALL" && !visible.has(nodeId)) return false;
  return true;
}

/**
 * Weighted progress of one node, computed in memory.
 *
 * When scope narrows the tree, weights are renormalized over the *included*
 * siblings. That is deliberate: a Site Engineer's section rollup should read as
 * 100% of their own section, not be capped at the section's share of the
 * project. It is the same arithmetic evaluated from a different root, which is
 * exactly how a Subcontractor PM's branch percentage works (file 20 §5.2).
 */
export function rollupNode(
  tree: ProgressTree,
  nodeId: string,
  opts: RollupOptions = {},
  memo: Map<string, number> = new Map()
): number {
  const memoKey = `${nodeId}:${opts.mode ?? "physical"}`;
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  const node = tree.nodes.get(nodeId);
  if (!node) return 0;

  const childIds = node.childIds.filter((id) => nodeIncluded(tree, id, opts));

  let result = 0;

  if (childIds.length > 0) {
    const children = childIds.map((id) => ({
      id,
      weightPercent: tree.nodes.get(id)!.weightPercent,
      progressPercent: rollupNode(tree, id, opts, memo),
    }));
    const weights = resolveSiblingWeights(children);
    result = children.reduce(
      (acc, c) => acc + (weights.get(c.id) ?? 0) * c.progressPercent,
      0
    );
  } else {
    const activities = tree.activitiesByNode.get(nodeId) ?? [];
    if (activities.length > 0) {
      const cleared =
        opts.mode !== "quality_cleared" || tree.qualityClearedNodeIds.has(nodeId);
      const weights = resolveSiblingWeights(activities);
      result = activities.reduce((acc, a) => {
        const contribution = cleared ? a.progressPercent : 0;
        return acc + (weights.get(a.id) ?? 0) * contribution;
      }, 0);
    }
  }

  const rounded = Math.round(result * 100) / 100;
  memo.set(memoKey, rounded);
  return rounded;
}

/** Roll up a set of roots into one figure, weighted among themselves. */
export function rollupRoots(
  tree: ProgressTree,
  rootIds: string[],
  opts: RollupOptions = {}
): number {
  const included = rootIds.filter((id) => nodeIncluded(tree, id, opts));
  if (included.length === 0) return 0;
  const memo = new Map<string, number>();
  const entries = included.map((id) => ({
    id,
    weightPercent: tree.nodes.get(id)!.weightPercent,
    progressPercent: rollupNode(tree, id, opts, memo),
  }));
  const weights = resolveSiblingWeights(entries);
  const sum = entries.reduce(
    (acc, e) => acc + (weights.get(e.id) ?? 0) * e.progressPercent,
    0
  );
  return Math.round(sum * 100) / 100;
}

function scopeVisible(scope: EffectiveScope | null): Set<string> | "ALL" {
  if (!scope) return "ALL";
  return isAll(scope.visibleWbsNodeIds) ? "ALL" : scope.visibleWbsNodeIds;
}

/**
 * The highest nodes of the visible set — the roots to roll up from for this
 * viewer. For a Subcontractor PM this is their contracted branch; for a Site
 * Engineer, their assigned section(s).
 */
export function visibleRootIds(
  tree: ProgressTree,
  visible: Set<string> | "ALL",
  opts: { includeDraft?: boolean } = {}
): string[] {
  if (visible === "ALL") {
    return tree.rootIds.filter((id) => nodeIncluded(tree, id, opts));
  }
  const roots: string[] = [];
  for (const id of visible) {
    const node = tree.nodes.get(id);
    if (!node) continue;
    if (!nodeIncluded(tree, id, opts)) continue;
    const parentVisible = node.parentId != null && visible.has(node.parentId);
    if (!parentVisible) roots.push(id);
  }
  return roots;
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
  scope?: EffectiveScope | null,
  mode: ProgressMode = "physical"
): Promise<number> {
  const node = await db.wbsNode.findUniqueOrThrow({
    where: { id: wbsNodeId },
    select: { projectId: true },
  });

  let effectiveScope = scope ?? null;
  if (user && !effectiveScope) {
    await assertProjectAccess(user, node.projectId);
    assertPermission(user, "wbs", "read");
    effectiveScope = await getEffectiveScope(user, node.projectId);
  }

  const visible = scopeVisible(effectiveScope);
  if (visible !== "ALL" && !visible.has(wbsNodeId)) return 0;

  const tree = await loadProgressTree(node.projectId);
  return rollupNode(tree, wbsNodeId, { visible, mode });
}

export async function computeProjectProgress(
  projectId: string,
  user?: SessionUser,
  mode: ProgressMode = "physical"
): Promise<number> {
  let scope: EffectiveScope | null = null;
  if (user) {
    await assertProjectAccess(user, projectId);
    assertPermission(user, "project", "read");
    scope = await getEffectiveScope(user, projectId);
  }

  const tree = await loadProgressTree(projectId);
  const visible = scopeVisible(scope);
  const roots = visibleRootIds(tree, visible);
  return rollupRoots(tree, roots, { visible, mode });
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
  /**
   * Weighted progress counting only quality-cleared work. Sits below
   * overallProgress wherever measured quantity has outrun inspection — which is
   * where rework risk concentrates even in nodes that look nearly finished
   * (file 18 §5.6).
   */
  qualityClearedProgress: number;
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

  const [activities, tree] = await Promise.all([
    db.scheduleActivity.findMany({
      where: {
        wbsNode: { projectId, status: { not: "DRAFT" } },
        ...wbsFilter,
      },
      select: {
        id: true,
        plannedStart: true,
        plannedFinish: true,
        actualStart: true,
        actualFinish: true,
        progressPercent: true,
        status: true,
      },
    }),
    loadProgressTree(projectId),
  ]);

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

  const visible = scopeVisible(scope);
  const roots = visibleRootIds(tree, visible);

  return {
    totalActivities: activities.length,
    overdue,
    dueSoon,
    inProgress,
    notStarted,
    complete,
    onHold,
    overallProgress: rollupRoots(tree, roots, { visible, mode: "physical" }),
    qualityClearedProgress: rollupRoots(tree, roots, {
      visible,
      mode: "quality_cleared",
    }),
  };
}
