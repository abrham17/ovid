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
  unionWbs,
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

  const oversightWbsNodeIds = individual.oversightWbsNodeIds ?? new Set<string>();

  const visibleWbsNodeIds = intersectWbs(
    org.visibleWbsNodeIds,
    individual.visibleWbsNodeIds
  );
  const writableWbsNodeIds = intersectWbs(
    org.visibleWbsNodeIds,
    individual.writableWbsNodeIds
  );

  // Oversight of a subcontract branch is granted by the Contractor PM on top of
  // the party ceiling, so it survives the org intersect above. It only ever adds
  // READ: writableWbsNodeIds is left untouched, because the subcontractor
  // executes that branch and this user only verifies it (file 20 §5.4).
  const visibleWithOversight = unionWbs(visibleWbsNodeIds, oversightWbsNodeIds);
  const orgWithOversight = unionWbs(org.visibleWbsNodeIds, oversightWbsNodeIds);

  return {
    projectId,
    visibleWbsNodeIds: visibleWithOversight,
    writableWbsNodeIds,
    canViewCostDetail: roleAllowsCostDetail(user.role, org.canViewCostDetail),
    canViewOperationalData: org.canViewOperationalData,
    fieldMode: org.fieldMode,
    scopeMode: org.scopeMode,
    scheduleReadMode: individual.scheduleReadMode,
    assignedActivityIds: individual.assignedActivityIds ?? new Set(),
    orgVisibleWbsNodeIds: orgWithOversight,
    oversightWbsNodeIds,
    oversightContractIds: individual.oversightContractIds ?? new Set(),
  };
}

/** Whether this user holds oversight over any branch on the project. */
export function hasOversight(scope: EffectiveScope): boolean {
  return isAll(scope.oversightWbsNodeIds)
    ? true
    : scope.oversightWbsNodeIds.size > 0;
}

/** Whether a node sits inside a branch this user oversees rather than executes. */
export function isOversightOnly(scope: EffectiveScope, wbsNodeId: string): boolean {
  if (!isWbsVisible(scope.oversightWbsNodeIds, wbsNodeId)) return false;
  return !isWbsVisible(scope.writableWbsNodeIds, wbsNodeId);
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
 * Expand Foreman schedule read to include immediate predecessors and successors,
 * plus every activity inside a branch they hold oversight over — an oversight
 * holder has to see the schedule they are verifying, not just their own tasks.
 */
export async function expandForemanScheduleActivityIds(
  scope: EffectiveScope
): Promise<Set<string>> {
  if (scope.scheduleReadMode !== "assignment_plus_deps") {
    return new Set();
  }
  const assigned = [...scope.assignedActivityIds];
  const ids = new Set(assigned);

  if (assigned.length > 0) {
    const deps = await db.scheduleDependency.findMany({
      where: {
        OR: [
          { predecessorId: { in: assigned } },
          { successorId: { in: assigned } },
        ],
      },
      select: { predecessorId: true, successorId: true },
    });
    for (const d of deps) {
      ids.add(d.predecessorId);
      ids.add(d.successorId);
    }
  }

  const oversight = scope.oversightWbsNodeIds;
  if (!isAll(oversight) && oversight.size > 0) {
    const overseen = await db.scheduleActivity.findMany({
      where: { wbsNodeId: { in: [...oversight] } },
      select: { id: true },
    });
    for (const a of overseen) ids.add(a.id);
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
