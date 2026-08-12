import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { IndividualScope, WbsIdSet } from "@/lib/scope/types";
import { unionWbs } from "@/lib/scope/types";
import { getDescendantIds, getOneLevelUpContext } from "@/lib/scope/wbs-tree";
import { getOversightContext } from "@/lib/scope/oversight-scope";
import type { UserRole } from "@/generated/prisma/enums";

/** Roles that are not narrowed by individual assignment (full org ceiling). */
const NO_NARROW_ROLES = new Set<UserRole>([
  "SENIOR_PM",
  "DEPUTY_PM",
  "ADMIN",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "QS",
  "FINANCE",
  "PROCUREMENT",
  "HR",
  "EQUIPMENT_MANAGER",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
]);

function allScope(scheduleReadMode: IndividualScope["scheduleReadMode"] = "scoped"): IndividualScope {
  return {
    visibleWbsNodeIds: "ALL",
    writableWbsNodeIds: "ALL",
    scheduleReadMode,
  };
}

/**
 * Layer 3 — individual assignment narrowing within an organization.
 * Returns "ALL" for roles that must see the whole org ceiling.
 *
 * Oversight assignments (file 20 §5.4) widen the *read* half of a narrowed
 * role's scope to the branches they watch, and never the write half: the
 * subcontractor executes that branch, this user only verifies it.
 */
export async function getIndividualAssignmentScope(
  user: SessionUser,
  projectId: string
): Promise<IndividualScope> {
  const oversight = await getOversightContext(user.id, projectId);
  const oversightWbs: WbsIdSet = oversight.visibleWbsNodeIds;
  const withOversight = (scope: IndividualScope): IndividualScope => {
    if (oversight.visibleWbsNodeIds.size === 0) return scope;
    return {
      ...scope,
      visibleWbsNodeIds: unionWbs(scope.visibleWbsNodeIds, oversightWbs),
      oversightWbsNodeIds: oversightWbs,
      oversightContractIds: oversight.contractIds,
    };
  };

  if (NO_NARROW_ROLES.has(user.role)) {
    return withOversight(allScope("scoped"));
  }

  if (user.role === "SUBCONTRACTOR_PM") {
    const assignments = await db.sectionAssignment.findMany({
      where: {
        projectId,
        userId: user.id,
        role: "SUBCONTRACTOR_OWNER",
        endedAt: null,
      },
      select: { wbsNodeId: true },
    });
    const roots = assignments.map((a) => a.wbsNodeId);
    if (roots.length === 0) {
      return withOversight({
        visibleWbsNodeIds: new Set(),
        writableWbsNodeIds: new Set(),
        scheduleReadMode: "scoped",
      });
    }
    const subtree = await getDescendantIds(roots);
    return withOversight({
      visibleWbsNodeIds: subtree,
      writableWbsNodeIds: new Set(subtree),
      scheduleReadMode: "scoped",
    });
  }

  if (user.role === "SUPERINTENDENT" || user.role === "SITE_ENGINEER") {
    const assignments = await db.sectionAssignment.findMany({
      where: {
        projectId,
        userId: user.id,
        endedAt: null,
      },
      select: { wbsNodeId: true },
    });
    const roots = assignments.map((a) => a.wbsNodeId);
    if (roots.length === 0) {
      return withOversight({
        visibleWbsNodeIds: new Set(),
        writableWbsNodeIds: new Set(),
        scheduleReadMode: "org_ceiling",
      });
    }
    const subtree = await getDescendantIds(roots);
    return withOversight({
      visibleWbsNodeIds: subtree,
      writableWbsNodeIds: new Set(subtree),
      scheduleReadMode: "org_ceiling",
    });
  }

  if (user.role === "FOREMAN") {
    const assignments = await db.activityAssignment.findMany({
      where: {
        userId: user.id,
        endedAt: null,
        role: "FOREMAN",
        scheduleActivity: { wbsNode: { projectId } },
      },
      select: {
        scheduleActivityId: true,
        scheduleActivity: { select: { wbsNodeId: true } },
      },
    });
    const activityIds = new Set(assignments.map((a) => a.scheduleActivityId));
    const taskWbs = [...new Set(assignments.map((a) => a.scheduleActivity.wbsNodeId))];
    if (taskWbs.length === 0) {
      return withOversight({
        visibleWbsNodeIds: new Set(),
        writableWbsNodeIds: new Set(),
        scheduleReadMode: "assignment_plus_deps",
        assignedActivityIds: new Set(),
      });
    }
    const readContext = await getOneLevelUpContext(taskWbs);
    return withOversight({
      visibleWbsNodeIds: readContext,
      writableWbsNodeIds: new Set(taskWbs),
      scheduleReadMode: "assignment_plus_deps",
      assignedActivityIds: activityIds,
    });
  }

  // Unknown / other roles: no narrowing
  return withOversight(allScope("scoped"));
}

/** Roles for which cost detail (rates/margin) is denied even on Contractor party. */
const COST_DETAIL_DENIED_ROLES = new Set<UserRole>([
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "FOREMAN",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "HR",
  "EQUIPMENT_MANAGER",
]);

/**
 * Whether the user may see unit rates / margin / cost actuals.
 * Party ceiling may already be false; this further denies for field/non-commercial roles.
 */
export function roleAllowsCostDetail(role: UserRole, partyCanView: boolean): boolean {
  if (!partyCanView) return false;
  if (COST_DETAIL_DENIED_ROLES.has(role)) return false;
  // Commercial / PM roles on contractor party
  return true;
}

export function emptyWbs(): WbsIdSet {
  return new Set();
}
