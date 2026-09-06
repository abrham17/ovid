import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess, can } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import {
  getEffectiveScope,
  assertScopeVisible,
  isAll,
} from "@/lib/scope";
import type { AssignmentRole } from "@/generated/prisma/enums";

type ActivityAssignRole = Extract<AssignmentRole, "SITE_ENGINEER" | "FOREMAN">;

const CAN_ASSIGN_SITE_ENGINEER = new Set([
  "SENIOR_PM",
  "DEPUTY_PM",
  "ADMIN",
  "SUBCONTRACTOR_PM",
]);

const CAN_ASSIGN_FOREMAN = new Set([
  "SENIOR_PM",
  "DEPUTY_PM",
  "ADMIN",
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "SUBCONTRACTOR_PM",
]);

function assertCanAssignRole(assignerRole: SessionUser["role"], role: ActivityAssignRole) {
  if (role === "SITE_ENGINEER" && !CAN_ASSIGN_SITE_ENGINEER.has(assignerRole)) {
    throw new DomainError(
      "Only Senior/Deputy PM or Subcontractor PM can assign a Site Engineer",
      403
    );
  }
  if (role === "FOREMAN" && !CAN_ASSIGN_FOREMAN.has(assignerRole)) {
    throw new DomainError("Not authorized to assign a Foreman to this activity", 403);
  }
}

/** Roles the current user may assign on activities. */
export function getActivityAssignCapabilities(user: SessionUser) {
  return {
    canAssignSiteEngineer: CAN_ASSIGN_SITE_ENGINEER.has(user.role),
    canAssignForeman: CAN_ASSIGN_FOREMAN.has(user.role),
    canUnassign: can(user.role, "assignment", "update"),
    mustStayInOwnOrg: user.partyType === "SUBCONTRACTOR",
  };
}

async function loadActivityContext(scheduleActivityId: string) {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: scheduleActivityId },
    select: {
      id: true,
      name: true,
      wbsNodeId: true,
      wbsNode: { select: { id: true, projectId: true, code: true, name: true } },
    },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  return activity;
}

/**
 * Subcontractor PM / main PM: writable WBS.
 * Site Engineer assigned to this activity may manage FOREMAN on it even without
 * section ownership (common for subcontractor SE under their PM).
 */
async function assertActivityCrewAuthority(
  user: SessionUser,
  activity: Awaited<ReturnType<typeof loadActivityContext>>,
  forRole: ActivityAssignRole
) {
  const scope = await getEffectiveScope(user, activity.wbsNode.projectId);
  if (
    isAll(scope.writableWbsNodeIds) ||
    scope.writableWbsNodeIds.has(activity.wbsNodeId)
  ) {
    return scope;
  }

  if (
    forRole === "FOREMAN" &&
    (user.role === "SITE_ENGINEER" || user.role === "SUPERINTENDENT")
  ) {
    const lead = await db.activityAssignment.findFirst({
      where: {
        scheduleActivityId: activity.id,
        userId: user.id,
        endedAt: null,
        role: "SITE_ENGINEER",
      },
    });
    if (lead) return scope;
  }

  throw new DomainError(
    "You do not have write access to assign crew on this activity",
    403
  );
}

/** Active assignment for a user on an activity (not ended). If none, returns null. */
export async function getActiveAssignment(
  user: SessionUser,
  scheduleActivityId: string
) {
  return db.activityAssignment.findFirst({
    where: {
      scheduleActivityId,
      userId: user.id,
      endedAt: null,
    },
  });
}

/** List all active assignments for a schedule activity */
export async function listActivityAssignments(
  user: SessionUser,
  scheduleActivityId: string
) {
  const activity = await loadActivityContext(scheduleActivityId);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "assignment", "read");

  const scope = await getEffectiveScope(user, activity.wbsNode.projectId);
  assertScopeVisible(scope, activity.wbsNodeId);

  return db.activityAssignment.findMany({
    where: { scheduleActivityId, endedAt: null },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          role: true,
          organizationId: true,
          organization: { select: { id: true, name: true, partyType: true } },
        },
      },
      assignedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ role: "asc" }, { assignedAt: "desc" }],
  });
}

/**
 * Candidates for activity crew assignment.
 * Subcontractor party → only their org; main contractor assigners → any project member with matching role.
 */
export async function listAssignableCandidates(
  user: SessionUser,
  projectId: string,
  scheduleActivityId: string,
  role: ActivityAssignRole
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "read");
  assertCanAssignRole(user.role, role);

  const activity = await loadActivityContext(scheduleActivityId);
  if (activity.wbsNode.projectId !== projectId) {
    throw new DomainError("Activity is not on this project", 400);
  }

  await assertActivityCrewAuthority(user, activity, role);

  const memberships = await db.projectMembership.findMany({
    where: {
      projectId,
      user: {
        role: role === "FOREMAN" ? "FOREMAN" : "SITE_ENGINEER",
        active: true,
        ...(user.partyType === "SUBCONTRACTOR"
          ? { organizationId: user.organizationId }
          : {}),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          role: true,
          jobTitle: true,
          organizationId: true,
        },
      },
      organization: { select: { id: true, name: true, partyType: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
    role: m.user.role,
    jobTitle: m.user.jobTitle,
    organizationId: m.user.organizationId,
    organizationName: m.organization.name,
  }));
}

/** Assign a user to a schedule activity (single active slot per role). */
export async function assignToActivity(
  user: SessionUser,
  scheduleActivityId: string,
  targetUserId: string,
  role: ActivityAssignRole
) {
  const activity = await loadActivityContext(scheduleActivityId);
  const projectId = activity.wbsNode.projectId;

  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "create");
  assertCanAssignRole(user.role, role);

  await assertActivityCrewAuthority(user, activity, role);

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, organizationId: true, active: true },
  });
  if (!targetUser || !targetUser.active) {
    throw new DomainError("Target user not found or inactive", 404);
  }

  if (role === "FOREMAN" && targetUser.role !== "FOREMAN") {
    throw new DomainError("FOREMAN assignment requires a Foreman user", 400);
  }
  if (role === "SITE_ENGINEER" && targetUser.role !== "SITE_ENGINEER") {
    throw new DomainError(
      "SITE_ENGINEER assignment requires a Site Engineer user",
      400
    );
  }

  if (user.partyType === "SUBCONTRACTOR") {
    if (targetUser.organizationId !== user.organizationId) {
      throw new DomainError(
        "Subcontractor staff can only assign people from their own organization",
        403
      );
    }
  }

  const membership = await db.projectMembership.findFirst({
    where: { projectId, userId: targetUserId },
  });
  if (!membership) {
    throw new DomainError("Target user is not a member of this project", 400);
  }

  // One active assignee per role on an activity
  await db.activityAssignment.updateMany({
    where: { scheduleActivityId, role, endedAt: null },
    data: { endedAt: new Date() },
  });

  const created = await db.activityAssignment.create({
    data: {
      scheduleActivityId,
      userId: targetUserId,
      role,
      assignedById: user.id,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });

  await db.notification.create({
    data: {
      userId: targetUserId,
      projectId,
      entityType: "activity",
      entityId: scheduleActivityId,
      type: "ACTIVITY_ASSIGNED",
      message: `You have been assigned as ${role} for activity "${activity.name}"`,
    },
  });

  return created;
}

/** Unassign (end) an active assignment */
export async function unassignFromActivity(
  user: SessionUser,
  assignmentId: string
) {
  const assignment = await db.activityAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      user: { select: { id: true, organizationId: true, role: true } },
      scheduleActivity: {
        select: {
          id: true,
          wbsNodeId: true,
          wbsNode: { select: { projectId: true } },
        },
      },
    },
  });
  if (!assignment) throw new DomainError("Assignment not found", 404);

  const projectId = assignment.scheduleActivity.wbsNode.projectId;
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "update");

  const role = assignment.role as ActivityAssignRole;
  if (role !== "SITE_ENGINEER" && role !== "FOREMAN") {
    throw new DomainError("Cannot unassign this assignment type", 400);
  }
  assertCanAssignRole(user.role, role);

  const activity = await loadActivityContext(assignment.scheduleActivity.id);
  await assertActivityCrewAuthority(user, activity, role);

  if (
    user.partyType === "SUBCONTRACTOR" &&
    assignment.user.organizationId !== user.organizationId
  ) {
    throw new DomainError(
      "Subcontractor staff can only unassign their own organization's people",
      403
    );
  }

  return db.activityAssignment.update({
    where: { id: assignmentId },
    data: { endedAt: new Date() },
  });
}

/** Get the currently assigned Foreman and Site Engineer for an activity */
export async function getActivityAssignmentsSummary(
  user: SessionUser,
  scheduleActivityId: string
) {
  const assignments = await listActivityAssignments(user, scheduleActivityId);

  return {
    siteEngineer: assignments.find((a) => a.role === "SITE_ENGINEER") ?? null,
    foreman: assignments.find((a) => a.role === "FOREMAN") ?? null,
    assignments,
  };
}

/**
 * Payload for activity detail page: assignments + who the current user may assign.
 */
export async function getActivityCrewPanelData(
  user: SessionUser,
  projectId: string,
  scheduleActivityId: string
) {
  await assertProjectAccess(user, projectId);
  const activity = await loadActivityContext(scheduleActivityId);
  if (activity.wbsNode.projectId !== projectId) {
    throw new DomainError("Activity is not on this project", 400);
  }

  const scope = await getEffectiveScope(user, projectId);
  const caps = getActivityAssignCapabilities(user);
  const writable =
    isAll(scope.writableWbsNodeIds) ||
    scope.writableWbsNodeIds.has(activity.wbsNodeId);

  let leadOnActivity = false;
  if (user.role === "SITE_ENGINEER" || user.role === "SUPERINTENDENT") {
    const lead = await db.activityAssignment.findFirst({
      where: {
        scheduleActivityId,
        userId: user.id,
        endedAt: null,
        role: "SITE_ENGINEER",
      },
      select: { id: true },
    });
    leadOnActivity = Boolean(lead);
  }

  let assignments: Awaited<ReturnType<typeof listActivityAssignments>> = [];
  try {
    if (can(user.role, "assignment", "read")) {
      assignments = await listActivityAssignments(user, scheduleActivityId);
    }
  } catch {
    assignments = [];
  }

  const canManage =
    (writable || leadOnActivity) &&
    can(user.role, "assignment", "create") &&
    (caps.canAssignForeman || caps.canAssignSiteEngineer);

  // SE on activity can manage foreman only; Sub/Senior PM can manage both when writable
  const canAssignForemanNow = canManage && caps.canAssignForeman;
  const canAssignSiteEngineerNow =
    canManage && caps.canAssignSiteEngineer && writable;

  let foremanCandidates: Awaited<ReturnType<typeof listAssignableCandidates>> =
    [];
  let engineerCandidates: Awaited<ReturnType<typeof listAssignableCandidates>> =
    [];

  if (canAssignForemanNow) {
    try {
      foremanCandidates = await listAssignableCandidates(
        user,
        projectId,
        scheduleActivityId,
        "FOREMAN"
      );
    } catch {
      foremanCandidates = [];
    }
  }
  if (canAssignSiteEngineerNow) {
    try {
      engineerCandidates = await listAssignableCandidates(
        user,
        projectId,
        scheduleActivityId,
        "SITE_ENGINEER"
      );
    } catch {
      engineerCandidates = [];
    }
  }

  return {
    activity: {
      id: activity.id,
      name: activity.name,
      wbsNodeId: activity.wbsNodeId,
      wbsCode: activity.wbsNode.code,
      wbsName: activity.wbsNode.name,
    },
    assignments,
    capabilities: {
      ...caps,
      canAssignSiteEngineer: canAssignSiteEngineerNow,
      canAssignForeman: canAssignForemanNow,
      canManage: canAssignForemanNow || canAssignSiteEngineerNow,
      activityWritable: writable,
    },
    candidates: {
      FOREMAN: foremanCandidates,
      SITE_ENGINEER: engineerCandidates,
    },
  };
}
