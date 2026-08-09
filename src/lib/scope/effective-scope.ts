import type { SessionUser } from "@/lib/auth";
import { assertProjectAccess } from "@/lib/permissions";
import { getOrganizationScope } from "@/lib/scope/organization-scope";
import {
  getIndividualAssignmentScope,
  roleAllowsCostDetail,
} from "@/lib/scope/individual-scope";
import {
  assertWritableWbs,
  intersectWbs,
  isAll,
  isWbsVisible,
  type EffectiveScope,
  type WbsIdSet,
  wbsNodeIdFilter,
  activityWbsFilter,
} from "@/lib/scope/types";
import { DomainError } from "@/lib/domain-rules";
import { db } from "@/lib/db";

/**
 * Compose Layer 1 (org) ∩ Layer 3 (individual) into one EffectiveScope
 * consumed by every tab service.
 */
export async function getEffectiveScope(
  user: SessionUser,
  projectId: string
): Promise<EffectiveScope> {
  await assertProjectAccess(user, projectId);

  const org = await getOrganizationScope(user, projectId);
  const individual = await getIndividualAssignmentScope(user, projectId);

  const visibleWbsNodeIds = intersectWbs(
    org.visibleWbsNodeIds,
    individual.visibleWbsNodeIds
  );
  const writableWbsNodeIds = intersectWbs(
    org.visibleWbsNodeIds,
    individual.writableWbsNodeIds
  );

  return {
    projectId,
    visibleWbsNodeIds,
    writableWbsNodeIds,
    canViewCostDetail: roleAllowsCostDetail(user.role, org.canViewCostDetail),
    canViewOperationalData: org.canViewOperationalData,
    fieldMode: org.fieldMode,
    scopeMode: org.scopeMode,
    scheduleReadMode: individual.scheduleReadMode,
    assignedActivityIds: individual.assignedActivityIds ?? new Set(),
    orgVisibleWbsNodeIds: org.visibleWbsNodeIds,
  };
}

export function scopeWbsFilter(scope: EffectiveScope) {
  return wbsNodeIdFilter(scope.visibleWbsNodeIds);
}

export function scopeWritableWbsFilter(scope: EffectiveScope) {
  return wbsNodeIdFilter(scope.writableWbsNodeIds);
}

export function scopeActivityFilter(scope: EffectiveScope) {
  return activityWbsFilter(scope.visibleWbsNodeIds);
}

/** WBS filter for schedule READ respecting scheduleReadMode. */
export function scheduleReadWbsFilter(scope: EffectiveScope): {
  wbsNodeId?: { in: string[] };
  id?: { in: string[] };
} {
  if (scope.scheduleReadMode === "org_ceiling") {
    return activityWbsFilter(scope.orgVisibleWbsNodeIds);
  }
  if (scope.scheduleReadMode === "assignment_plus_deps") {
    // Caller should expand with dependency IDs; base is assigned activities.
    // If no assignments, return impossible filter.
    if (scope.assignedActivityIds.size === 0) {
      return { id: { in: [] } };
    }
    return { id: { in: [...scope.assignedActivityIds] } };
  }
  return activityWbsFilter(scope.visibleWbsNodeIds);
}

/**
 * Expand Foreman schedule read to include immediate predecessors and successors.
 */
export async function expandForemanScheduleActivityIds(
  scope: EffectiveScope
): Promise<Set<string>> {
  if (scope.scheduleReadMode !== "assignment_plus_deps") {
    return new Set();
  }
  const assigned = [...scope.assignedActivityIds];
  if (assigned.length === 0) return new Set();

  const deps = await db.scheduleDependency.findMany({
    where: {
      OR: [
        { predecessorId: { in: assigned } },
        { successorId: { in: assigned } },
      ],
    },
    select: { predecessorId: true, successorId: true },
  });

  const ids = new Set(assigned);
  for (const d of deps) {
    ids.add(d.predecessorId);
    ids.add(d.successorId);
  }
  return ids;
}

export function assertScopeWritable(scope: EffectiveScope, wbsNodeId: string) {
  assertWritableWbs(scope.writableWbsNodeIds, wbsNodeId);
}

export function assertScopeVisible(scope: EffectiveScope, wbsNodeId: string) {
  if (!isWbsVisible(scope.visibleWbsNodeIds, wbsNodeId)) {
    throw new DomainError("You do not have visibility into this WBS node", 403);
  }
}

export function hasFullWbsVisibility(scope: EffectiveScope): boolean {
  return isAll(scope.visibleWbsNodeIds);
}

export type { EffectiveScope, WbsIdSet };
