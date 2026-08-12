import { DomainError } from "@/lib/domain-rules";

/** "ALL" means no WBS narrowing; otherwise an explicit set of visible node IDs. */
export type WbsIdSet = "ALL" | Set<string>;

export type FieldMode = "full" | "client_summary" | "regulator_compliance";

export type ScopeMode = "wbs" | "procurement_own";

/**
 * Schedule read exception:
 * - scoped: filter to visibleWbsNodeIds
 * - org_ceiling: SE/Superintendent full schedule read within org ceiling, write still section-scoped
 * - assignment_plus_deps: Foreman assigned activities + immediate predecessors/successors
 */
export type ScheduleReadMode = "scoped" | "org_ceiling" | "assignment_plus_deps";

export type OrganizationScope = {
  visibleWbsNodeIds: WbsIdSet;
  canViewCostDetail: boolean;
  canViewOperationalData: boolean;
  fieldMode: FieldMode;
  scopeMode: ScopeMode;
};

export type IndividualScope = {
  /** Read visibility after individual narrowing (before org intersect). */
  visibleWbsNodeIds: WbsIdSet;
  /** Write visibility — typically section/task roots' descendants. */
  writableWbsNodeIds: WbsIdSet;
  scheduleReadMode: ScheduleReadMode;
  /** Activity IDs for Foreman assignment_plus_deps mode. */
  assignedActivityIds?: Set<string>;
  /**
   * Branches this user oversees on the contractor's behalf (file 20 §5.4).
   * Grants read of the mirrored branch but never execution write — the
   * subcontractor executes, this user verifies.
   */
  oversightWbsNodeIds?: WbsIdSet;
  /** Contracts this user is the oversight gate for. */
  oversightContractIds?: Set<string>;
};

export type EffectiveScope = {
  projectId: string;
  visibleWbsNodeIds: WbsIdSet;
  writableWbsNodeIds: WbsIdSet;
  canViewCostDetail: boolean;
  canViewOperationalData: boolean;
  fieldMode: FieldMode;
  scopeMode: ScopeMode;
  scheduleReadMode: ScheduleReadMode;
  assignedActivityIds: Set<string>;
  /** Org-ceiling WBS before individual narrowing — used for schedule org_ceiling reads. */
  orgVisibleWbsNodeIds: WbsIdSet;
  /** Overseen branches, already folded into visibleWbsNodeIds. */
  oversightWbsNodeIds: WbsIdSet;
  oversightContractIds: Set<string>;
};

export function isAll(set: WbsIdSet): set is "ALL" {
  return set === "ALL";
}

export function intersectWbs(a: WbsIdSet, b: WbsIdSet): WbsIdSet {
  if (a === "ALL") return b === "ALL" ? "ALL" : new Set(b);
  if (b === "ALL") return new Set(a);
  const out = new Set<string>();
  for (const id of a) {
    if (b.has(id)) out.add(id);
  }
  return out;
}

export function unionWbs(a: WbsIdSet, b: WbsIdSet): WbsIdSet {
  if (a === "ALL" || b === "ALL") return "ALL";
  return new Set([...a, ...b]);
}

export function wbsIdsArray(set: WbsIdSet): string[] | null {
  if (set === "ALL") return null;
  return [...set];
}

/** Prisma filter fragment for models with wbsNodeId. Empty object when ALL. */
export function wbsNodeIdFilter(set: WbsIdSet): { wbsNodeId?: { in: string[] } } {
  if (set === "ALL") return {};
  return { wbsNodeId: { in: [...set] } };
}

/** Prisma filter for ScheduleActivity via nested wbsNode. */
export function activityWbsFilter(set: WbsIdSet): { wbsNode?: { id: { in: string[] } }; wbsNodeId?: { in: string[] } } {
  if (set === "ALL") return {};
  return { wbsNodeId: { in: [...set] } };
}

export function assertWritableWbs(writable: WbsIdSet, wbsNodeId: string) {
  if (writable === "ALL") return;
  if (!writable.has(wbsNodeId)) {
    throw new DomainError("You do not have write access to this WBS node", 403);
  }
}

export function isWbsVisible(visible: WbsIdSet, wbsNodeId: string): boolean {
  if (visible === "ALL") return true;
  return visible.has(wbsNodeId);
}
