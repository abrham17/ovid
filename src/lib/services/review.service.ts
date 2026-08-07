import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";

// ── Helpers ──────────────────────────────────────────────────────────

/** Map Prisma's { fullName, role } to the CommentThread component's expected { name, role }. */
function mapUser(u: { id: string; fullName: string; role: string }) {
  return { id: u.id, name: u.fullName, role: u.role };
}

function mapComment(c: any) {
  return {
    ...c,
    user: mapUser(c.user),
    replies: c.replies?.map((r: any) => ({ ...r, user: mapUser(r.user) })) ?? [],
  };
}

// ── ReviewComment Service ────────────────────────────────────────────

export type CreateReviewCommentInput = {
  projectId: string;
  entityType: string;
  entityId: string;
  body: string;
  parentId?: string;
  isDecision?: boolean;
  decisionLabel?: string;
};

const USER_SELECT = { id: true, fullName: true, role: true } as const;

export async function addReviewComment(user: SessionUser, input: CreateReviewCommentInput) {
  await assertProjectAccess(user, input.projectId);

  const comment = await db.reviewComment.create({
    data: {
      projectId: input.projectId,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: user.id,
      body: input.body,
      parentId: input.parentId,
      isDecision: input.isDecision ?? false,
      decisionLabel: input.decisionLabel,
    },
    include: { user: { select: USER_SELECT } },
  });

  return mapComment(comment);
}

export async function getEntityComments(user: SessionUser, entityType: string, entityId: string, projectId: string) {
  await assertProjectAccess(user, projectId);

  const comments = await db.reviewComment.findMany({
    where: { entityType, entityId, projectId },
    include: {
      user: { select: USER_SELECT },
      replies: {
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return comments.map(mapComment);
}

export async function getRecentComments(user: SessionUser, projectId: string, limit = 10) {
  await assertProjectAccess(user, projectId);

  const comments = await db.reviewComment.findMany({
    where: { projectId, parentId: null },
    include: { user: { select: USER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return comments.map(mapComment);
}

// ── ScheduleChangeRequest Service ────────────────────────────────────

export type CreateScheduleChangeInput = {
  projectId: string;
  activityId: string;
  newStart: Date;
  newFinish: Date;
  reason: string;
};

export async function createScheduleChangeRequest(user: SessionUser, input: CreateScheduleChangeInput) {
  await assertProjectAccess(user, input.projectId);

  const activity = await db.scheduleActivity.findUnique({
    where: { id: input.activityId },
    select: { wbsNode: { select: { projectId: true } }, plannedStart: true, plannedFinish: true },
  });
  if (!activity || activity.wbsNode.projectId !== input.projectId) {
    throw new DomainError("Activity not found in this project", 404);
  }
  if (input.newFinish < input.newStart) {
    throw new DomainError("New finish must be on or after new start");
  }

  const existing = await db.scheduleChangeRequest.findFirst({
    where: { activityId: input.activityId, status: "PENDING" },
  });
  if (existing) {
    throw new DomainError("There is already a pending schedule change request for this activity", 409);
  }

  return db.scheduleChangeRequest.create({
    data: {
      projectId: input.projectId,
      activityId: input.activityId,
      requestedById: user.id,
      newStart: input.newStart,
      newFinish: input.newFinish,
      reason: input.reason,
    },
    include: { requestedBy: { select: USER_SELECT } },
  });
}

export async function reviewScheduleChangeRequest(
  user: SessionUser,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  decisionReason?: string
) {
  const request = await db.scheduleChangeRequest.findUnique({
    where: { id: requestId },
    include: { activity: { select: { id: true, wbsNode: { select: { projectId: true } } } } },
  });
  if (!request) throw new DomainError("Schedule change request not found", 404);

  await assertProjectAccess(user, request.activity.wbsNode.projectId);
  assertPermission(user, "schedule", "approve");

  if (request.status !== "PENDING") {
    throw new DomainError("This request has already been reviewed", 409);
  }

  const [updated] = await db.$transaction(async (tx) => {
    const approved = await tx.scheduleChangeRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewedById: user.id,
        reviewedAt: new Date(),
        decisionReason,
      },
    });

    if (decision === "APPROVED") {
      await tx.scheduleActivity.update({
        where: { id: request.activityId },
        data: {
          plannedStart: request.newStart,
          plannedFinish: request.newFinish,
        },
      });
    }

    return [approved];
  });

  return updated;
}

export async function listScheduleChangeRequests(user: SessionUser, projectId: string, status?: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "schedule", "read");

  return db.scheduleChangeRequest.findMany({
    where: {
      projectId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      requestedBy: { select: USER_SELECT },
      reviewedBy: { select: USER_SELECT },
      activity: { select: { id: true, name: true, plannedStart: true, plannedFinish: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getScheduleChangeRequest(user: SessionUser, requestId: string) {
  const request = await db.scheduleChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      requestedBy: { select: USER_SELECT },
      reviewedBy: { select: USER_SELECT },
      activity: {
        select: {
          id: true, name: true, plannedStart: true, plannedFinish: true,
          baselineStart: true, baselineFinish: true,
        },
      },
    },
  });
  if (!request) throw new DomainError("Schedule change request not found", 404);
  await assertProjectAccess(user, request.projectId);
  return request;
}