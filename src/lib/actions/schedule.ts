"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { DependencyType, StoppageType, ActivityStatus } from "@/generated/prisma/enums";
import { ok, fail, runAction, type ActionResult } from "@/lib/action-result";

const createActivitySchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  name: z.string().min(2),
  baselineStart: z.coerce.date(),
  baselineFinish: z.coerce.date(),
  plannedStart: z.coerce.date(),
  plannedFinish: z.coerce.date(),
});

export async function createActivity(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = createActivitySchema.parse({
      projectId: formData.get("projectId"),
      wbsNodeId: formData.get("wbsNodeId"),
      name: formData.get("name"),
      baselineStart: formData.get("baselineStart"),
      baselineFinish: formData.get("baselineFinish"),
      plannedStart: formData.get("plannedStart"),
      plannedFinish: formData.get("plannedFinish"),
    });
    await ensureContractorOrSubcontractor(user, parsed.projectId);

    const activity = await db.scheduleActivity.create({
      data: {
        wbsNodeId: parsed.wbsNodeId,
        name: parsed.name,
        baselineStart: parsed.baselineStart,
        baselineFinish: parsed.baselineFinish,
        plannedStart: parsed.plannedStart,
        plannedFinish: parsed.plannedFinish,
        progressPercent: 0,
        status: "NOT_STARTED",
      },
    });
    await audit({
      userId: user.id,
      entityType: "ScheduleActivity",
      entityId: activity.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/schedule`);
    return ok("Schedule activity created.");
  });
}

const createDependencySchema = z.object({
  projectId: z.string().min(1),
  predecessorId: z.string().min(1),
  successorId: z.string().min(1),
  dependencyType: z.enum(["FS", "SS", "FF", "SF"]),
  lagDays: z.coerce.number().int().min(0).default(0),
});

export async function createDependency(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = createDependencySchema.parse({
      projectId: formData.get("projectId"),
      predecessorId: formData.get("predecessorId"),
      successorId: formData.get("successorId"),
      dependencyType: formData.get("dependencyType"),
      lagDays: formData.get("lagDays") || 0,
    });
    await ensureContractorOrSubcontractor(user, parsed.projectId);

    if (parsed.predecessorId === parsed.successorId) {
      return fail("An activity cannot depend on itself.");
    }

    const dep = await db.scheduleDependency.create({
      data: {
        predecessorId: parsed.predecessorId,
        successorId: parsed.successorId,
        dependencyType: parsed.dependencyType as DependencyType,
        lagDays: parsed.lagDays,
      },
    });
    await audit({
      userId: user.id,
      entityType: "ScheduleDependency",
      entityId: dep.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/schedule`);
    return ok("Dependency created.");
  });
}

const createStoppageSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  scheduleActivityId: z.string().optional(),
  stoppageType: z.enum([
    "WEATHER",
    "DESIGN_CHANGE",
    "MATERIAL_SHORTAGE",
    "CLIENT_INSTRUCTION",
    "EQUIPMENT_BREAKDOWN",
    "LABOR_DISPUTE",
    "FORCE_MAJEURE",
    "CONTRACTOR_DEFAULT",
    "OTHER",
  ]),
  reason: z.string().min(3),
  stationFrom: z.string().optional(),
  stationTo: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export async function createStoppage(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = createStoppageSchema.parse({
      projectId: formData.get("projectId"),
      wbsNodeId: formData.get("wbsNodeId") || undefined,
      scheduleActivityId: formData.get("scheduleActivityId") || undefined,
      stoppageType: formData.get("stoppageType"),
      reason: formData.get("reason"),
      stationFrom: formData.get("stationFrom") || undefined,
      stationTo: formData.get("stationTo") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
    });
    await ensureContractorOrSubcontractor(user, parsed.projectId);

    const stoppage = await db.stoppageEntry.create({
      data: {
        projectId: parsed.projectId,
        wbsNodeId: parsed.wbsNodeId,
        scheduleActivityId: parsed.scheduleActivityId,
        stoppageType: parsed.stoppageType as StoppageType,
        reason: parsed.reason,
        stationFrom: parsed.stationFrom,
        stationTo: parsed.stationTo,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      },
    });
    await audit({
      userId: user.id,
      entityType: "StoppageEntry",
      entityId: stoppage.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/schedule`);
    return ok("Work stoppage logged.");
  });
}

export async function updateActivityProgress(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const activityId = String(formData.get("activityId"));
    const projectId = String(formData.get("projectId"));
    const progress = z.coerce.number().min(0).max(100).parse(formData.get("progressPercent"));
    const status = String(formData.get("status")) as ActivityStatus;

    await ensureContractorOrSubcontractor(user, projectId);

    await db.scheduleActivity.update({
      where: { id: activityId },
      data: { progressPercent: progress, status },
    });
    await audit({
      userId: user.id,
      entityType: "ScheduleActivity",
      entityId: activityId,
      action: "UPDATE",
      diff: { progressPercent: progress, status },
    });
    revalidatePath(`/projects/${projectId}/schedule`);
    return ok("Activity progress updated.");
  });
}

export async function flagActivityBlocked(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { canFlagActivityBlocked } = await import("@/lib/rbac");
    if (!canFlagActivityBlocked(user.role)) {
      return fail("Only HSE officers may flag activities as blocked.");
    }
    const activityId = String(formData.get("activityId"));
    const projectId = String(formData.get("projectId"));
    await ensureContractorOrSubcontractor(user, projectId);

    await db.scheduleActivity.update({
      where: { id: activityId },
      data: { status: "ON_HOLD" },
    });
    await audit({
      userId: user.id,
      entityType: "ScheduleActivity",
      entityId: activityId,
      action: "UPDATE",
      diff: { status: "ON_HOLD", reason: "HSE blocked" },
    });
    revalidatePath(`/projects/${projectId}/schedule`);
    return ok("Activity flagged as ON_HOLD / Blocked.");
  });
}

export async function approveScheduleBaseline(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const { canApproveScheduleBaseline } = await import("@/lib/rbac");
    if (!canApproveScheduleBaseline(user.role)) {
      return fail("Only Senior PM may approve the schedule baseline.");
    }
    const projectId = String(formData.get("projectId"));
    await ensureContractorOrSubcontractor(user, projectId);

    const activities = await db.scheduleActivity.findMany({
      where: { wbsNode: { projectId } },
    });

    await db.$transaction(
      activities.map((a) =>
        db.scheduleActivity.update({
          where: { id: a.id },
          data: {
            plannedStart: a.baselineStart,
            plannedFinish: a.baselineFinish,
          },
        })
      )
    );

    await audit({
      userId: user.id,
      entityType: "Project",
      entityId: projectId,
      action: "UPDATE",
      diff: { baselineApproved: true, activityCount: activities.length },
    });
    revalidatePath(`/projects/${projectId}/schedule`);
    return ok("Schedule baseline approved.");
  });
}

async function ensureContractorOrSubcontractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || (party.partyType !== "CONTRACTOR" && party.partyType !== "SUBCONTRACTOR")) {
    throw new Error("Only contractor or subcontractor site staff may modify the schedule.");
  }
  return party;
}