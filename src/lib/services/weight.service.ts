import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import { getEffectiveScope, assertScopeWritable } from "@/lib/scope";
import {
  WEIGHT_TOLERANCE,
  checkSiblingSum,
  normalizeToHundred,
  type Weighted,
} from "@/lib/weight-math";

export type WeightViolationLevel = "wbs" | "activity";

export type WeightViolation = {
  level: WeightViolationLevel;
  /** The parent whose children fail the rule. */
  parentId: string;
  parentCode: string;
  parentName: string;
  childCount: number;
  sum: number;
  shortfall: number;
  partiallyWeighted: boolean;
  /** Operator-facing message, e.g. "Ground Floor's children sum to 94%, not 100%". */
  message: string;
};

function violationMessage(
  parentName: string,
  level: WeightViolationLevel,
  check: ReturnType<typeof checkSiblingSum>
): string {
  const noun = level === "wbs" ? "children" : "activities";
  if (check.partiallyWeighted) {
    return `${parentName}'s ${noun} are only partly weighted — every sibling needs a weight, or none of them do (currently summing to ${check.sum}%)`;
  }
  return `${parentName}'s ${noun} sum to ${check.sum}%, not 100%`;
}

type NodeRow = {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  status: string;
  weightPercent: unknown;
};

/**
 * Recursively check the 100% Rule across a whole subtree — both WBS sibling sets
 * and each leaf node's activity set.
 *
 * DRAFT nodes are included by default: this is the gate a plan submission has to
 * pass *before* going live (file 20 §3.2), so validating only ACTIVE nodes would
 * check the wrong thing.
 */
export async function validateWeightTree(
  rootWbsNodeId: string,
  opts: { includeDraft?: boolean; tolerance?: number } = {}
): Promise<WeightViolation[]> {
  const { includeDraft = true, tolerance = WEIGHT_TOLERANCE } = opts;

  const root = await db.wbsNode.findUnique({
    where: { id: rootWbsNodeId },
    select: { id: true, projectId: true },
  });
  if (!root) throw new DomainError("WBS node not found", 404);

  const all = await db.wbsNode.findMany({
    where: { projectId: root.projectId },
    select: {
      id: true,
      parentId: true,
      code: true,
      name: true,
      status: true,
      weightPercent: true,
    },
  });

  const byId = new Map<string, NodeRow>(all.map((n) => [n.id, n as NodeRow]));
  const childrenOf = new Map<string, NodeRow[]>();
  for (const n of all) {
    if (!n.parentId) continue;
    const list = childrenOf.get(n.parentId) ?? [];
    list.push(n as NodeRow);
    childrenOf.set(n.parentId, list);
  }

  // Collect the subtree rooted at rootWbsNodeId.
  const subtree: NodeRow[] = [];
  const stack = [rootWbsNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    const node = byId.get(id);
    if (!node) continue;
    if (!includeDraft && node.status === "DRAFT") continue;
    subtree.push(node);
    for (const child of childrenOf.get(id) ?? []) stack.push(child.id);
  }

  const subtreeIds = subtree.map((n) => n.id);
  const activities = await db.scheduleActivity.findMany({
    where: { wbsNodeId: { in: subtreeIds } },
    select: { id: true, wbsNodeId: true, weightPercent: true },
  });
  const activitiesOf = new Map<string, Array<{ id: string; weightPercent: unknown }>>();
  for (const a of activities) {
    const list = activitiesOf.get(a.wbsNodeId) ?? [];
    list.push({ id: a.id, weightPercent: a.weightPercent });
    activitiesOf.set(a.wbsNodeId, list);
  }

  const toWeighted = (rows: Array<{ id: string; weightPercent: unknown }>): Weighted[] =>
    rows.map((r) => ({
      id: r.id,
      weightPercent: r.weightPercent == null ? null : Number(r.weightPercent),
    }));

  const violations: WeightViolation[] = [];

  for (const node of subtree) {
    const kids = (childrenOf.get(node.id) ?? []).filter(
      (c) => includeDraft || c.status !== "DRAFT"
    );

    if (kids.length > 0) {
      const check = checkSiblingSum(toWeighted(kids), tolerance);
      if (!check.ok) {
        violations.push({
          level: "wbs",
          parentId: node.id,
          parentCode: node.code,
          parentName: node.name,
          childCount: kids.length,
          sum: check.sum,
          shortfall: check.shortfall,
          partiallyWeighted: check.partiallyWeighted,
          message: violationMessage(node.name, "wbs", check),
        });
      }
      // A node with WBS children rolls up from those children; its own
      // activities (if any) are not a second, competing sibling set.
      continue;
    }

    const acts = activitiesOf.get(node.id) ?? [];
    if (acts.length > 0) {
      const check = checkSiblingSum(toWeighted(acts), tolerance);
      if (!check.ok) {
        violations.push({
          level: "activity",
          parentId: node.id,
          parentCode: node.code,
          parentName: node.name,
          childCount: acts.length,
          sum: check.sum,
          shortfall: check.shortfall,
          partiallyWeighted: check.partiallyWeighted,
          message: violationMessage(node.name, "activity", check),
        });
      }
    }
  }

  return violations;
}

/** Throw a specific, operator-readable error when the 100% Rule fails anywhere. */
export async function assertWeightTreeValid(
  rootWbsNodeId: string,
  opts: { includeDraft?: boolean; tolerance?: number } = {}
): Promise<void> {
  const violations = await validateWeightTree(rootWbsNodeId, opts);
  if (violations.length === 0) return;

  const shown = violations.slice(0, 5).map((v) => v.message);
  const extra =
    violations.length > shown.length
      ? ` (and ${violations.length - shown.length} more)`
      : "";
  throw new DomainError(
    `Completion weights do not satisfy the 100% Rule: ${shown.join("; ")}${extra}`,
    400
  );
}

/** Roles allowed to set completion weights on WBS nodes. */
const WBS_WEIGHT_SETTERS = new Set(["SENIOR_PM", "DEPUTY_PM", "SUBCONTRACTOR_PM", "ADMIN"]);

/**
 * Assign completion weights to a complete sibling set of WBS nodes.
 *
 * Requires the *whole* sibling set in one call: allowing partial updates is how
 * you end up with a set summing to 94% and a rollup that quietly means nothing.
 * Values are normalized to sum to exactly 100 before saving.
 */
export async function setWbsNodeWeights(
  user: SessionUser,
  projectId: string,
  entries: Array<{ wbsNodeId: string; weightPercent: number }>
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "wbs", "update");

  if (!WBS_WEIGHT_SETTERS.has(user.role)) {
    throw new DomainError(
      "Only Project Managers may set WBS completion weights",
      403
    );
  }
  if (entries.length === 0) {
    throw new DomainError("No weights supplied", 400);
  }

  const ids = entries.map((e) => e.wbsNodeId);
  const nodes = await db.wbsNode.findMany({
    where: { id: { in: ids }, projectId },
    select: { id: true, parentId: true },
  });
  if (nodes.length !== ids.length) {
    throw new DomainError("One or more WBS nodes not found in this project", 404);
  }

  const parentIds = new Set(nodes.map((n) => n.parentId));
  if (parentIds.size !== 1) {
    throw new DomainError(
      "All nodes in one weight update must share the same parent — weights are only meaningful within a sibling set",
      400
    );
  }
  const parentId = nodes[0].parentId;
  if (!parentId) {
    throw new DomainError(
      "Root WBS nodes carry no weight — a root is 100% of its own subtree by definition",
      400
    );
  }

  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, parentId);

  const siblings = await db.wbsNode.findMany({
    where: { parentId },
    select: { id: true },
  });
  const supplied = new Set(ids);
  const missing = siblings.filter((s) => !supplied.has(s.id));
  if (missing.length > 0) {
    throw new DomainError(
      `Weights must be set for the whole sibling set at once — ${missing.length} sibling(s) missing from this update`,
      400
    );
  }

  const normalized = normalizeToHundred(
    entries.map((e) => ({ id: e.wbsNodeId, weightPercent: e.weightPercent }))
  );

  return db.$transaction(
    [...normalized.entries()].map(([id, weightPercent]) =>
      db.wbsNode.update({ where: { id }, data: { weightPercent } })
    )
  );
}

/** Roles allowed to weight activities within a leaf work package. */
const ACTIVITY_WEIGHT_SETTERS = new Set([
  "SENIOR_PM",
  "DEPUTY_PM",
  "SUBCONTRACTOR_PM",
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "ADMIN",
]);

/**
 * Assign completion weights to every activity under one WBS node.
 * Site Engineers own this level — they are the ones adding the
 * rebar/formwork/concrete activities under a wall (file 20 §2.4).
 */
export async function setActivityWeights(
  user: SessionUser,
  wbsNodeId: string,
  entries: Array<{ activityId: string; weightPercent: number }>
) {
  const node = await db.wbsNode.findUnique({
    where: { id: wbsNodeId },
    select: { id: true, projectId: true },
  });
  if (!node) throw new DomainError("WBS node not found", 404);

  await assertProjectAccess(user, node.projectId);
  assertPermission(user, "schedule", "update");

  if (!ACTIVITY_WEIGHT_SETTERS.has(user.role)) {
    throw new DomainError("Your role may not set activity completion weights", 403);
  }
  if (entries.length === 0) {
    throw new DomainError("No weights supplied", 400);
  }

  const scope = await getEffectiveScope(user, node.projectId);
  assertScopeWritable(scope, wbsNodeId);

  const activities = await db.scheduleActivity.findMany({
    where: { wbsNodeId },
    select: { id: true },
  });
  const supplied = new Set(entries.map((e) => e.activityId));
  const unknown = [...supplied].filter(
    (id) => !activities.some((a) => a.id === id)
  );
  if (unknown.length > 0) {
    throw new DomainError(
      "One or more activities do not belong to this WBS node",
      400
    );
  }
  const missing = activities.filter((a) => !supplied.has(a.id));
  if (missing.length > 0) {
    throw new DomainError(
      `Weights must be set for every activity under this node at once — ${missing.length} activity(ies) missing from this update`,
      400
    );
  }

  const normalized = normalizeToHundred(
    entries.map((e) => ({ id: e.activityId, weightPercent: e.weightPercent }))
  );

  return db.$transaction(
    [...normalized.entries()].map(([id, weightPercent]) =>
      db.scheduleActivity.update({ where: { id }, data: { weightPercent } })
    )
  );
}

/**
 * Distribute weight equally across a sibling set — the convenience default a PM
 * reaches for before hand-tuning ("four floors, 25% each").
 */
export async function distributeWeightsEvenly(
  user: SessionUser,
  projectId: string,
  parentWbsNodeId: string
) {
  const siblings = await db.wbsNode.findMany({
    where: { parentId: parentWbsNodeId },
    select: { id: true },
  });
  if (siblings.length === 0) {
    throw new DomainError("This node has no children to weight", 400);
  }
  const each = 100 / siblings.length;
  return setWbsNodeWeights(
    user,
    projectId,
    siblings.map((s) => ({ wbsNodeId: s.id, weightPercent: each }))
  );
}
