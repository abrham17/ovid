import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import { can } from "@/lib/permissions";

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
  const activity = await db.scheduleActivity.findUnique({
    where: { id: scheduleActivityId },
    select: { wbsNode: { select: { projectId: true } } },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "assignment", "read");

  return db.activityAssignment.findMany({
    where: { scheduleActivityId, endedAt: null },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ role: "asc" }, { assignedAt: "desc" }],
  });
}

/** Assign a user to a schedule activity */
export async function assignToActivity(
  user: SessionUser,
  scheduleActivityId: string,
  targetUserId: string,
  role: "SITE_ENGINEER" | "FOREMAN"
) {
  const activity = await db.scheduleActivity.findUnique({
    where: { id: scheduleActivityId },
    select: { wbsNode: { select: { projectId: true } } },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "assignment", "create");

  // Validate the target user exists and belongs to a project org
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, organizationId: true },
  });
  if (!targetUser) throw new DomainError("Target user not found", 404);

  // Check role validity:
  // - SENIOR_PM/DEPUTY_PM can assign SITE_ENGINEER
  // - SITE_ENGINEER can assign FOREMAN
  // - SUPERINTENDENT can assign FOREMAN
  if (role === "SITE_ENGINEER") {
    if (!can(user.role, "assignment", "create")) {
      throw new DomainError("Only PM roles can assign Site Engineers", 403);
    }
  }
  // For FOREMAN assignment, SITE_ENGINEER or SUPERINTENDENT or PM can assign
  if (role === "FOREMAN" && !["SENIOR_PM", "DEPUTY_PM", "SITE_ENGINEER", "SUPERINTENDENT"].includes(user.role)) {
    throw new DomainError("Not authorized to assign a Foreman", 403);
  }

  // End any existing active assignment for this user+activity (supersede)
  await db.activityAssignment.updateMany({
    where: { scheduleActivityId, userId: targetUserId, endedAt: null },
    data: { endedAt: new Date() },
  });

  return db.activityAssignment.create({
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
}

/** Unassign (end) an active assignment */
export async function unassignFromActivity(
  user: SessionUser,
  assignmentId: string
) {
  const assignment = await db.activityAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      scheduleActivity: {
        select: { wbsNode: { select: { projectId: true } } },
      },
    },
  });
  if (!assignment) throw new DomainError("Assignment not found", 404);
  await assertProjectAccess(user, assignment.scheduleActivity.wbsNode.projectId);
  assertPermission(user, "assignment", "update");

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
  const activity = await db.scheduleActivity.findUnique({
    where: { id: scheduleActivityId },
    select: { wbsNode: { select: { projectId: true } } },
  });
  if (!activity) throw new DomainError("Schedule activity not found", 404);
  await assertProjectAccess(user, activity.wbsNode.projectId);
  assertPermission(user, "assignment", "read");

  const assignments = await db.activityAssignment.findMany({
    where: { scheduleActivityId, endedAt: null },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
    },
  });

  return {
    siteEngineer: assignments.find((a) => a.role === "SITE_ENGINEER") ?? null,
    foreman: assignments.find((a) => a.role === "FOREMAN") ?? null,
  };
}