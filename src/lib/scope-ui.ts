import type { SessionUser } from "@/lib/auth";
import {
  getEffectiveScope,
  isAll,
  type EffectiveScope,
} from "@/lib/scope";

export type ScopeUiHints = {
  scope: EffectiveScope;
  /** True when user has at least one visible WBS node (or ALL). */
  hasVisibleScope: boolean;
  /** True when user can write somewhere (or ALL). */
  hasWritableScope: boolean;
  /** Role is narrowed by SectionAssignment / ActivityAssignment. */
  isAssignmentNarrowed: boolean;
  /** Empty because no section/task assignment yet. */
  needsAssignment: boolean;
  banner: string | null;
  emptyTitle: string | null;
  emptyDescription: string | null;
  /** Writable WBS ids for form dropdowns; null means all visible/project nodes. */
  writableWbsIds: string[] | null;
  canViewCostDetail: boolean;
  fieldMode: EffectiveScope["fieldMode"];
};

function assignmentMessage(role: SessionUser["role"]): {
  banner: string;
  emptyTitle: string;
  emptyDescription: string;
} {
  if (role === "FOREMAN") {
    return {
      banner:
        "Your view is limited to assigned tasks (plus nearby sibling context for coordination).",
      emptyTitle: "No tasks assigned",
      emptyDescription:
        "Ask your Site Engineer or Superintendent to assign you to schedule activities. Until then, task data stays empty.",
    };
  }
  if (role === "SITE_ENGINEER" || role === "SUPERINTENDENT") {
    return {
      banner:
        "Your operational data is scoped to section(s) you own. Schedule remains readable project-wide for coordination.",
      emptyTitle: "No sections assigned",
      emptyDescription:
        "Ask a Project Manager to assign you ownership of a WBS section. Until then, Overview / Daily / Quality stay empty.",
    };
  }
  if (role === "SUBCONTRACTOR_PM") {
    return {
      banner:
        "Your view is limited to WBS section(s) assigned to your subcontract by the main contractor PM.",
      emptyTitle: "No WBS section assigned",
      emptyDescription:
        "Ask the Senior or Deputy Project Manager to assign your firm a WBS section on the WBS page.",
    };
  }
  return {
    banner: "Your view is limited to your organization's contractual scope.",
    emptyTitle: "Nothing in scope",
    emptyDescription:
      "No WBS branches are visible for your organization on this project yet.",
  };
}

/** Server helper — call once per page and pass hints into views. */
export async function getScopeUiHints(
  user: SessionUser,
  projectId: string
): Promise<ScopeUiHints> {
  const scope = await getEffectiveScope(user, projectId);
  const isAssignmentNarrowed =
    scope.scheduleReadMode === "org_ceiling" ||
    scope.scheduleReadMode === "assignment_plus_deps" ||
    user.role === "SUBCONTRACTOR_PM";

  const hasVisibleScope =
    isAll(scope.visibleWbsNodeIds) || scope.visibleWbsNodeIds.size > 0;
  const hasWritableScope =
    isAll(scope.writableWbsNodeIds) || scope.writableWbsNodeIds.size > 0;

  const needsAssignment =
    isAssignmentNarrowed && !hasWritableScope && !hasVisibleScope;

  const msgs = assignmentMessage(user.role);

  let banner: string | null = null;
  if (needsAssignment) {
    banner = msgs.emptyDescription;
  } else if (isAssignmentNarrowed) {
    banner = msgs.banner;
  } else if (user.partyType === "SUBCONTRACTOR" && !isAll(scope.visibleWbsNodeIds)) {
    banner =
      "Showing only WBS branches under your active subcontract(s). Cost rates stay redacted.";
  } else if (!scope.canViewCostDetail && scope.fieldMode !== "full") {
    banner =
      scope.fieldMode === "client_summary"
        ? "Client summary view — commercial rates and detailed mitigation are redacted."
        : scope.fieldMode === "regulator_compliance"
          ? "Regulator view — only compliance-relevant fields are shown."
          : null;
  } else if (!scope.canViewCostDetail) {
    banner = "Unit rates, margin, and monetary totals are redacted for your role.";
  }

  return {
    scope,
    hasVisibleScope,
    hasWritableScope,
    isAssignmentNarrowed,
    needsAssignment,
    banner,
    emptyTitle: needsAssignment || !hasVisibleScope ? msgs.emptyTitle : null,
    emptyDescription:
      needsAssignment || !hasVisibleScope ? msgs.emptyDescription : null,
    writableWbsIds: isAll(scope.writableWbsNodeIds)
      ? null
      : [...scope.writableWbsNodeIds],
    canViewCostDetail: scope.canViewCostDetail,
    fieldMode: scope.fieldMode,
  };
}

/** Filter WBS options for create forms to writable nodes only. */
export function filterWritableWbsOptions<T extends { id: string }>(
  nodes: T[],
  writableWbsIds: string[] | null
): T[] {
  if (writableWbsIds == null) return nodes;
  const set = new Set(writableWbsIds);
  return nodes.filter((n) => set.has(n.id));
}
