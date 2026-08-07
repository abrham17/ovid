import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/enums";

type CreateNotificationInput = {
  userId: string;
  projectId: string;
  type: NotificationType;
  entityType: string;
  entityId: string;
  message: string;
};

/** Create a notification record */
export async function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
    },
  });
}

/** Trigger: Foreman submits daily report → notify Superintendent + Site Engineer */
export async function notifyDailyReportSubmitted(
  projectId: string,
  dailyEntryId: string,
  submittedById: string,
  wbsNodeId: string
) {
  // Find the assigned Site Engineer and Superintendent for this WBS node's active activities
  const supervisors = await db.$queryRaw<Array<{ user_id: string }>>`
    SELECT DISTINCT aa.user_id
    FROM "ActivityAssignment" aa
    INNER JOIN "ScheduleActivity" sa ON sa.id = aa.schedule_activity_id
    WHERE sa.wbs_node_id = ${wbsNodeId}
      AND aa.role IN ('SITE_ENGINEER'::text, 'FOREMAN'::text)
      AND aa.ended_at IS NULL
      AND aa.user_id != ${submittedById};
  `;

  for (const s of supervisors) {
    await createNotification({
      userId: s.user_id,
      projectId,
      type: "DAILY_REPORT_PENDING_SIGNOFF",
      entityType: "EarthworkDailyEntry", // or StructureDailyEntry
      entityId: dailyEntryId,
      message: "A daily report has been submitted and needs your review",
    });
  }
}

/** Trigger: Site Engineer requests inspection → notify QC Inspector */
export async function notifyInspectionRequested(
  projectId: string,
  itrId: string,
  wbsNodeId: string
) {
  // Find QC inspectors on this project
  const qcUsers = await db.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT u.id FROM "User" u
    INNER JOIN "ProjectMembership" pm ON pm.user_id = u.id
    WHERE pm.project_id = ${projectId}
      AND u.role = 'QC_INSPECTOR'
      AND pm.is_active = true;
  `;

  for (const qc of qcUsers) {
    await createNotification({
      userId: qc.id,
      projectId,
      type: "OTHER",
      entityType: "InspectionTestRecord",
      entityId: itrId,
      message: "An inspection has been requested — review and schedule",
    });
  }
}

/** Trigger: QC fails inspection → notify Site Engineer + assigned Foreman */
export async function notifyInspectionFailed(
  projectId: string,
  defectLogId: string,
  scheduleActivityId: string
) {
  // Find assigned Site Engineer and Foreman for this activity
  const assignedUsers = await db.activityAssignment.findMany({
    where: { scheduleActivityId, endedAt: null },
    select: { userId: true, role: true },
  });

  for (const a of assignedUsers) {
    await createNotification({
      userId: a.userId,
      projectId,
      type: "OTHER",
      entityType: "DefectLog",
      entityId: defectLogId,
      message: "An inspection has failed — a defect log was opened requiring rework",
    });
  }
}

/** Trigger: Activity assigned → notify assigned user */
export async function notifyActivityAssigned(
  projectId: string,
  scheduleActivityId: string,
  assignedUserId: string,
  role: string
) {
  await createNotification({
    userId: assignedUserId,
    projectId,
    type: "ACTIVITY_ASSIGNED",
    entityType: "ScheduleActivity",
    entityId: scheduleActivityId,
    message: `You have been assigned as ${role === "SITE_ENGINEER" ? "Site Engineer" : "Foreman"} for an activity`,
  });
}

/** Trigger: Dependency request created → notify PMs */
export async function notifyDependencyRequestPending(
  projectId: string,
  requestId: string
) {
  const pmUsers = await db.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT u.id FROM "User" u
    INNER JOIN "ProjectMembership" pm ON pm.user_id = u.id
    WHERE pm.project_id = ${projectId}
      AND u.role IN ('SENIOR_PM', 'DEPUTY_PM')
      AND pm.is_active = true;
  `;

  for (const pm of pmUsers) {
    await createNotification({
      userId: pm.id,
      projectId,
      type: "DEPENDENCY_REQUEST_PENDING",
      entityType: "PendingDependencyRequest",
      entityId: requestId,
      message: "A cross-branch dependency request needs your review",
    });
  }
}

/** Trigger: Contract terminated → notify affected users */
export async function notifyContractStatusChanged(
  projectId: string,
  contractId: string,
  contractorOrgId: string,
  newStatus: string
) {
  const orgUsers = await db.user.findMany({
    where: { organizationId: contractorOrgId },
    select: { id: true },
  });

  for (const u of orgUsers) {
    await createNotification({
      userId: u.id,
      projectId,
      type: "CONTRACT_STATUS_CHANGED",
      entityType: "Contract",
      entityId: contractId,
      message: `Your subcontract status changed to ${newStatus}`,
    });
  }
}