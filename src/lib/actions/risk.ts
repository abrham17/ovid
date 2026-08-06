"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, getProjectParty, canCreateRisk, canCloseRisk, canEscalateRisk } from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { RiskCategory, StoppageType } from "@/generated/prisma/enums";
import {
  assertProjectMember,
  assertScheduleActivityInProject,
  assertWbsNodeVisibleToUser,
} from "@/lib/actions/project-guards";

async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may modify the risk register.");
  }
  return party;
}

const riskSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  category: z.enum([
    "DESIGN", "PROCUREMENT", "WEATHER", "FX_IMPORT", "GEOTECHNICAL",
    "REGULATORY", "LABOR", "SECURITY_THEFT", "FINANCIAL", "OTHER",
  ]),
  description: z.string().min(3),
  likelihood: z.coerce.number().int().min(1).max(5),
  impact: z.coerce.number().int().min(1).max(5),
  ownerId: z.string().min(1),
  mitigationPlan: z.string().optional(),
});

export async function createRisk(formData: FormData) {
  const user = await requireUser();
  const parsed = riskSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    category: formData.get("category"),
    description: formData.get("description"),
    likelihood: formData.get("likelihood"),
    impact: formData.get("impact"),
    ownerId: formData.get("ownerId"),
    mitigationPlan: formData.get("mitigationPlan") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canCreateRisk(user.role)) {
    throw new Error("Your role is not authorized to record risks.");
  }
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);
  await assertProjectMember(parsed.projectId, parsed.ownerId);

  const risk = await db.riskEntry.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      category: parsed.category as RiskCategory,
      description: parsed.description,
      likelihood: parsed.likelihood,
      impact: parsed.impact,
      ownerId: parsed.ownerId,
      mitigationPlan: parsed.mitigationPlan,
      status: "OPEN",
    },
  });
  await audit({ userId: user.id, entityType: "RiskEntry", entityId: risk.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/risk`);
}

const riskActionSchema = z.object({
  projectId: z.string().min(1),
  riskId: z.string().min(1),
});

export async function closeRisk(formData: FormData) {
  const user = await requireUser();
  const parsed = riskActionSchema.parse({
    projectId: formData.get("projectId"),
    riskId: formData.get("riskId"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canCloseRisk(user.role)) {
    throw new Error("Your role is not authorized to close risks.");
  }

  const result = await db.riskEntry.updateMany({
    where: { id: parsed.riskId, projectId: parsed.projectId, status: { in: ["OPEN", "MITIGATING"] } },
    data: { status: "CLOSED" },
  });
  if (result.count === 0) throw new Error("Risk is not open, mitigating, or in this project.");
  await audit({ userId: user.id, entityType: "RiskEntry", entityId: parsed.riskId, action: "UPDATE", diff: { status: "CLOSED" } });
  revalidatePath(`/projects/${parsed.projectId}/risk`);
}

// ---------------------------------------------------------------
// Risk realisation → escalates into a StoppageEntry (schedule) or
// VariationOrder (cost) — the reinforcing-failure-loop wiring.
// ---------------------------------------------------------------

const escalateToStoppageSchema = z.object({
  projectId: z.string().min(1),
  riskId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  scheduleActivityId: z.string().optional(),
  stoppageType: z.enum([
    "WEATHER", "DESIGN_CHANGE", "MATERIAL_SHORTAGE", "CLIENT_INSTRUCTION",
    "EQUIPMENT_BREAKDOWN", "LABOR_DISPUTE", "FORCE_MAJEURE", "CONTRACTOR_DEFAULT", "OTHER",
  ]),
  reason: z.string().min(3),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export async function escalateRiskToStoppage(formData: FormData) {
  const user = await requireUser();
  const parsed = escalateToStoppageSchema.parse({
    projectId: formData.get("projectId"),
    riskId: formData.get("riskId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    scheduleActivityId: formData.get("scheduleActivityId") || undefined,
    stoppageType: formData.get("stoppageType"),
    reason: formData.get("reason"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canEscalateRisk(user.role)) {
    throw new Error("Your role is not authorized to realise risks.");
  }
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);
  await assertScheduleActivityInProject(parsed.projectId, parsed.scheduleActivityId);
  await assertRiskCanRealize(parsed.projectId, parsed.riskId);

  const stoppage = await db.stoppageEntry.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      scheduleActivityId: parsed.scheduleActivityId,
      stoppageType: parsed.stoppageType as StoppageType,
      reason: parsed.reason,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    },
  });
  const result = await db.riskEntry.updateMany({
    where: { id: parsed.riskId, projectId: parsed.projectId, status: { in: ["OPEN", "MITIGATING"] } },
    data: { status: "REALIZED", realizedAsStoppageId: stoppage.id },
  });
  if (result.count === 0) throw new Error("Risk is already closed, realized, or outside this project.");
  await audit({ userId: user.id, entityType: "RiskEntry", entityId: parsed.riskId, action: "UPDATE", diff: { status: "REALIZED", stoppageId: stoppage.id } });
  revalidatePath(`/projects/${parsed.projectId}/risk`);
}

const escalateToVariationSchema = z.object({
  projectId: z.string().min(1),
  riskId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  itemNo: z.string().min(1),
  workDescription: z.string().min(3),
  costImpact: z.coerce.number().nonnegative(),
  timeImpactDays: z.coerce.number().int().min(0).default(0),
});

export async function escalateRiskToVariation(formData: FormData) {
  const user = await requireUser();
  const parsed = escalateToVariationSchema.parse({
    projectId: formData.get("projectId"),
    riskId: formData.get("riskId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    itemNo: formData.get("itemNo"),
    workDescription: formData.get("workDescription"),
    costImpact: formData.get("costImpact"),
    timeImpactDays: formData.get("timeImpactDays") || 0,
  });
  await requireContractor(user, parsed.projectId);
  if (!canEscalateRisk(user.role)) {
    throw new Error("Your role is not authorized to realise risks.");
  }
  await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);
  await assertRiskCanRealize(parsed.projectId, parsed.riskId);

  const variation = await db.variationOrder.create({
    data: {
      projectId: parsed.projectId,
      wbsNodeId: parsed.wbsNodeId,
      itemNo: parsed.itemNo,
      workDescription: parsed.workDescription,
      costImpact: parsed.costImpact,
      timeImpactDays: parsed.timeImpactDays,
      status: "CONTRACTOR_PREPARED",
    },
  });
  const result = await db.riskEntry.updateMany({
    where: { id: parsed.riskId, projectId: parsed.projectId, status: { in: ["OPEN", "MITIGATING"] } },
    data: { status: "REALIZED", realizedAsVariationId: variation.id },
  });
  if (result.count === 0) throw new Error("Risk is already closed, realized, or outside this project.");
  await audit({ userId: user.id, entityType: "RiskEntry", entityId: parsed.riskId, action: "UPDATE", diff: { status: "REALIZED", variationId: variation.id } });
  revalidatePath(`/projects/${parsed.projectId}/risk`);
}

async function assertRiskCanRealize(projectId: string, riskId: string) {
  const risk = await db.riskEntry.findFirst({
    where: { id: riskId, projectId, status: { in: ["OPEN", "MITIGATING"] } },
    select: { id: true },
  });
  if (!risk) throw new Error("Risk is already closed, realized, or outside this project.");
}
