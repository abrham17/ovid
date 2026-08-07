import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateRegulatoryReportInput,
  CreateDecisionInput,
  CreateLessonInput,
} from "@/lib/validations/compliance";

/**
 * Phase 4 — Compliance exports, decision log, lessons learned.
 * Supports MoUDC grading / progress / safety compliance registers.
 */

export async function listCompliance(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "read");

  const [reports, decisions, lessons] = await Promise.all([
    db.regulatoryReport.findMany({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      take: 50,
    }),
    db.decisionLog.findMany({
      where: { projectId },
      orderBy: { decidedAt: "desc" },
      take: 50,
      include: {
        madeBy: { select: { id: true, fullName: true } },
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
    db.lessonsLearned.findMany({
      where: { projectId },
      orderBy: { recordedAt: "desc" },
      take: 50,
      include: {
        recordedBy: { select: { id: true, fullName: true } },
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  return { reports, decisions, lessons };
}

export async function createRegulatoryReport(
  user: SessionUser,
  input: CreateRegulatoryReportInput
) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "project", "update");

  return db.regulatoryReport.create({
    data: {
      projectId: input.projectId,
      reportType: input.reportType,
      filePath: input.filePath,
    },
  });
}

export async function createDecision(
  user: SessionUser,
  projectId: string,
  input: CreateDecisionInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  return db.decisionLog.create({
    data: {
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      documentId: input.documentId ?? null,
      riskId: input.riskId ?? null,
      variationId: input.variationId ?? null,
      decisionType: input.decisionType,
      decision: input.decision,
      rationale: input.rationale ?? null,
      madeByUserId: user.id,
    },
  });
}

export async function createLesson(
  user: SessionUser,
  projectId: string,
  input: CreateLessonInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "update");

  return db.lessonsLearned.create({
    data: {
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      phase: input.phase ?? null,
      category: input.category,
      lesson: input.lesson,
      recommendation: input.recommendation ?? null,
      recordedByUserId: user.id,
    },
  });
}

/**
 * Build a JSON snapshot for MoUDC-style progress / grading export.
 * Stored path is a virtual register entry (filePath).
 */
export async function generateProgressSnapshot(
  user: SessionUser,
  projectId: string
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "read");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      contractorOrg: { select: { name: true, contractorGrade: true, licenseNumber: true } },
      clientOrg: { select: { name: true } },
    },
  });

  const [wbsCount, activities, stoppages, incidents, measurements] =
    await Promise.all([
      db.wbsNode.count({ where: { projectId } }),
      db.scheduleActivity.findMany({
        where: { wbsNode: { projectId } },
        select: {
          name: true,
          status: true,
          progressPercent: true,
          baselineFinish: true,
          plannedFinish: true,
        },
      }),
      db.stoppageEntry.count({ where: { projectId } }),
      db.safetyIncident.count({
        where: { wbsNode: { projectId }, status: { not: "CLOSED" } },
      }),
      db.measurementEntry.findMany({
        where: { wbsNode: { projectId }, status: { in: ["CERTIFIED", "PAID"] } },
        select: { quantity: true, unitRate: true, status: true },
      }),
    ]);

  const certifiedValue = measurements.reduce(
    (s, m) => s + Number(m.quantity) * Number(m.unitRate),
    0
  );

  const snapshot = {
    generatedAt: new Date().toISOString(),
    project: {
      code: project.code,
      name: project.name,
      type: project.projectType,
      status: project.status,
      contractValue: Number(project.contractValue),
      contractor: project.contractorOrg.name,
      grade: project.contractorOrg.contractorGrade,
      license: project.contractorOrg.licenseNumber,
      client: project.clientOrg.name,
    },
    summary: {
      wbsNodes: wbsCount,
      activities: activities.length,
      avgProgress:
        activities.length > 0
          ? activities.reduce((s, a) => s + Number(a.progressPercent), 0) /
            activities.length
          : 0,
      stoppages,
      openSafetyIncidents: incidents,
      certifiedMeasurementValue: certifiedValue,
    },
    activities: activities.map((a) => ({
      name: a.name,
      status: a.status,
      progress: Number(a.progressPercent),
    })),
  };

  const filePath = `/exports/${project.code}-progress-${Date.now()}.json`;

  await db.regulatoryReport.create({
    data: {
      projectId,
      reportType: "PROGRESS_SUBMISSION",
      filePath,
    },
  });

  return { filePath, snapshot };
}
