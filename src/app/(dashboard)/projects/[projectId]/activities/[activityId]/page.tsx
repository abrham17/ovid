import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { assertProjectAccess, assertPermission, can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ActivityDetailPage } from "@/components/projects/views/activity-detail-view";
import { getEntityComments } from "@/lib/services/review.service";
import { getActivityCrewPanelData } from "@/lib/services/assignment.service";

export const dynamic = "force-dynamic";

export default async function ActivityDetailRoute({
  params,
}: {
  params: Promise<{ projectId: string; activityId: string }>;
}) {
  const { projectId, activityId } = await params;
  const session = await getSession();
  if (!session) return notFound();

  await assertProjectAccess(session, projectId);
  assertPermission(session, "schedule", "read");

  const activity = await db.scheduleActivity.findUnique({
    where: { id: activityId },
    include: {
      wbsNode: {
        select: {
          id: true,
          code: true,
          name: true,
          projectId: true,
          project: { select: { name: true } },
        },
      },
      assignments: {
        where: { endedAt: null },
        include: {
          user: { select: { id: true, fullName: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
      _count: {
        select: {
          stoppages: true,
          scheduleChangeRequests: true,
        },
      },
    },
  });

  if (!activity || activity.wbsNode.projectId !== projectId) notFound();

  const itrs = await db.inspectionTestRecord.findMany({
    where: { wbsNodeId: activity.wbsNodeId },
    select: { id: true, result: true },
  });

  const assignedEngineer = activity.assignments.find(
    (a) => a.role === "SITE_ENGINEER"
  )?.user;
  const assignedForeman = activity.assignments.find(
    (a) => a.role === "FOREMAN"
  )?.user;

  const [comments, crewData] = await Promise.all([
    getEntityComments(session, "activity", activityId, projectId),
    can(session.role, "assignment", "read")
      ? getActivityCrewPanelData(session, projectId, activityId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const timeline = [
    {
      id: "created",
      type: "created" as const,
      title: "Activity created",
      description: activity.name,
      timestamp: activity.createdAt,
    },
    ...activity.assignments.map((a) => ({
      id: `assigned-${a.id}`,
      type: "assigned" as const,
      title: `${a.role.replace("_", " ")} assigned`,
      description: a.user.fullName,
      timestamp: a.assignedAt,
      user: { name: a.user.fullName, role: a.role },
    })),
  ];

  return (
    <ActivityDetailPage
      activity={{
        id: activity.id,
        name: activity.name,
        status: activity.status,
        progressPercent: Number(activity.progressPercent),
        plannedStart: activity.plannedStart,
        plannedFinish: activity.plannedFinish,
        baselineStart: activity.baselineStart,
        baselineFinish: activity.baselineFinish,
        actualStart: activity.actualStart,
        actualFinish: activity.actualFinish,
        wbsNode: activity.wbsNode,
        assignedEngineer: assignedEngineer
          ? { id: assignedEngineer.id, name: assignedEngineer.fullName }
          : null,
        assignedForeman: assignedForeman
          ? { id: assignedForeman.id, name: assignedForeman.fullName }
          : null,
        totalDailyReports: 0,
        totalInspections: 0,
        inspectionTestRecords: itrs.map((i) => ({ id: i.id, result: i.result })),
      }}
      projectId={projectId}
      comments={comments}
      timeline={timeline}
      onAddComment={async () => {}}
      crew={
        crewData
          ? {
              assignments: crewData.assignments.map((a) => ({
                id: a.id,
                role: a.role,
                user: {
                  id: a.user.id,
                  fullName: a.user.fullName,
                  role: a.user.role,
                },
                assignedBy: a.assignedBy,
              })),
              canManage: crewData.capabilities.canManage,
              canAssignSiteEngineer: crewData.capabilities.canAssignSiteEngineer,
              canAssignForeman: crewData.capabilities.canAssignForeman,
              mustStayInOwnOrg: crewData.capabilities.mustStayInOwnOrg,
              candidates: crewData.candidates,
            }
          : undefined
      }
    />
  );
}
