"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  getProjectParty,
  canManageBoq,
  canRecordCostActual,
  canPrepareIpc,
  canPayIpc,
  canPrepareVariation,
  canCheckContractorVariation,
  canCertifyMeasurement,
  canCheckConsultantVariation,
  canApproveVariation,
} from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type {
  CostType,
  CostSourceType,
  VariationOrderStatus,
} from "@/generated/prisma/enums";

async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may modify cost records.");
  }
  return party;
}

async function requireConsultant(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONSULTANT") {
    throw new Error("Only the consultant may certify measurements.");
  }
  return party;
}

// ---------------------------------------------------------------
// BoQ items (budget baseline)
// ---------------------------------------------------------------

const boqSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  itemCode: z.string().min(1),
  description: z.string().min(2),
  unit: z.string().min(1),
  budgetedQuantity: z.coerce.number().positive(),
  unitRate: z.coerce.number().positive(),
});

export async function createBoqItem(formData: FormData) {
  const user = await requireUser();
  const parsed = boqSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    itemCode: formData.get("itemCode"),
    description: formData.get("description"),
    unit: formData.get("unit"),
    budgetedQuantity: formData.get("budgetedQuantity"),
    unitRate: formData.get("unitRate"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canManageBoq(user.role)) {
    throw new Error("Your role is not authorized to manage BoQ items.");
  }
  const item = await db.boqItem.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      itemCode: parsed.itemCode,
      description: parsed.description,
      unit: parsed.unit,
      budgetedQuantity: parsed.budgetedQuantity,
      unitRate: parsed.unitRate,
    },
  });
  await audit({ userId: user.id, entityType: "BoqItem", entityId: item.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

// ---------------------------------------------------------------
// Cost actuals (live spend / commitments against BoQ)
// ---------------------------------------------------------------

const costActualSchema = z.object({
  projectId: z.string().min(1),
  boqItemId: z.string().min(1),
  costType: z.enum(["COMMITTED", "ACTUAL"]),
  amount: z.coerce.number().nonnegative(),
  sourceType: z.enum(["PURCHASE_ORDER", "INVOICE", "PAYROLL", "EQUIPMENT_USAGE", "VARIATION_ORDER"]),
  sourceId: z.string().min(1),
  recordedAt: z.coerce.date(),
});

export async function recordCostActual(formData: FormData) {
  const user = await requireUser();
  const parsed = costActualSchema.parse({
    projectId: formData.get("projectId"),
    boqItemId: formData.get("boqItemId"),
    costType: formData.get("costType"),
    amount: formData.get("amount"),
    sourceType: formData.get("sourceType"),
    sourceId: formData.get("sourceId"),
    recordedAt: formData.get("recordedAt") || new Date(),
  });
  await requireContractor(user, parsed.projectId);
  if (!canRecordCostActual(user.role)) {
    throw new Error("Your role is not authorized to record cost actuals.");
  }

  const actual = await db.costActual.create({
    data: {
      boqItemId: parsed.boqItemId,
      costType: parsed.costType as CostType,
      amount: parsed.amount,
      sourceType: parsed.sourceType as CostSourceType,
      sourceId: parsed.sourceId,
      recordedAt: parsed.recordedAt,
    },
  });
  await audit({ userId: user.id, entityType: "CostActual", entityId: actual.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

// ---------------------------------------------------------------
// IPC / measurement lifecycle (spec Module 2 gate)
// ---------------------------------------------------------------

const measurementSchema = z.object({
  projectId: z.string().min(1),
  contractId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  itemNo: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitRate: z.coerce.number().positive(),
  certificateNo: z.string().optional(),
});

export async function createMeasurement(formData: FormData) {
  const user = await requireUser();
  const parsed = measurementSchema.parse({
    projectId: formData.get("projectId"),
    contractId: formData.get("contractId"),
    wbsNodeId: formData.get("wbsNodeId"),
    itemNo: formData.get("itemNo"),
    quantity: formData.get("quantity"),
    unitRate: formData.get("unitRate"),
    certificateNo: formData.get("certificateNo") || undefined,
  });
  await requireContractor(user, parsed.projectId);
  if (!canPrepareIpc(user.role)) {
    throw new Error("Your role is not authorized to prepare IPC measurements.");
  }

  const entry = await db.measurementEntry.create({
    data: {
      contractId: parsed.contractId,
      wbsNodeId: parsed.wbsNodeId,
      itemNo: parsed.itemNo,
      quantity: parsed.quantity,
      unitRate: parsed.unitRate,
      certificateNo: parsed.certificateNo,
      status: "DRAFT",
    },
  });
  await audit({ userId: user.id, entityType: "MeasurementEntry", entityId: entry.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

/**
 * Mandatory gate (spec Module 2): an IPC cannot be submitted unless the WBS
 * node has a linked BoQ item (measured quantity is tied to budgeted quantity).
 */
async function assertIpcEligible(measurementId: string): Promise<{ wbsNodeId: string; itemNo: string }> {
  const entry = await db.measurementEntry.findUnique({
    where: { id: measurementId },
    include: { wbsNode: { include: { _count: { select: { boqItems: true } } } } },
  });
  if (!entry) throw new Error("Measurement not found.");
  if (Number(entry.quantity) <= 0) throw new Error("IPC requires measured quantity.");
  if (entry.wbsNode._count.boqItems === 0) {
    throw new Error("IPC cannot be submitted: this WBS node has no linked BoQ item (mandatory gate).");
  }
  return { wbsNodeId: entry.wbsNodeId, itemNo: entry.itemNo };
}

const statusActionSchema = z.object({
  projectId: z.string().min(1),
  measurementId: z.string().min(1),
});

/**
 * Enforces the digitized IPC workflow as a real state machine (spec Module
 * 2: "measured quantities entered by site QS -> reviewed by site engineer
 * -> submitted to consultant for certification -> approved/queried ->
 * payment released. Every step is timestamped and attributable"). Without
 * this, any status-transition function could be called on an entry in any
 * state, letting a step be skipped (e.g. paying a never-certified measurement).
 * Uses a conditional updateMany so the check-then-write is atomic against
 * concurrent calls, rather than a separate findUnique + update.
 */
async function transitionMeasurement(
  measurementId: string,
  fromStatuses: string[],
  toStatus: "SUBMITTED" | "CONSULTANT_QUERIED" | "CERTIFIED" | "PAID"
) {
  const result = await db.measurementEntry.updateMany({
    where: { id: measurementId, status: { in: fromStatuses as never[] } },
    data: { status: toStatus },
  });
  if (result.count === 0) {
    const current = await db.measurementEntry.findUnique({ where: { id: measurementId }, select: { status: true } });
    throw new Error(
      current
        ? `Cannot move measurement from ${current.status} to ${toStatus} (expected one of: ${fromStatuses.join(", ")}).`
        : "Measurement not found."
    );
  }
}

export async function submitMeasurement(formData: FormData) {
  const user = await requireUser();
  const parsed = statusActionSchema.parse({
    projectId: formData.get("projectId"),
    measurementId: formData.get("measurementId"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canPrepareIpc(user.role)) throw new Error("Your role is not authorized to submit IPC measurements.");
  await assertIpcEligible(parsed.measurementId);

  await transitionMeasurement(parsed.measurementId, ["DRAFT", "CONSULTANT_QUERIED"], "SUBMITTED");
  await audit({ userId: user.id, entityType: "MeasurementEntry", entityId: parsed.measurementId, action: "UPDATE", diff: { status: "SUBMITTED" } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

export async function queryMeasurement(formData: FormData) {
  const user = await requireUser();
  const parsed = statusActionSchema.parse({
    projectId: formData.get("projectId"),
    measurementId: formData.get("measurementId"),
  });
  await requireConsultant(user, parsed.projectId);
  if (!canCertifyMeasurement("CONSULTANT", user.role)) {
    throw new Error("Only the consultant engineer may query measurements.");
  }

  await transitionMeasurement(parsed.measurementId, ["SUBMITTED"], "CONSULTANT_QUERIED");
  await audit({ userId: user.id, entityType: "MeasurementEntry", entityId: parsed.measurementId, action: "UPDATE", diff: { status: "CONSULTANT_QUERIED" } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

export async function certifyMeasurement(formData: FormData) {
  const user = await requireUser();
  const parsed = statusActionSchema.parse({
    projectId: formData.get("projectId"),
    measurementId: formData.get("measurementId"),
  });
  await requireConsultant(user, parsed.projectId);
  if (!canCertifyMeasurement("CONSULTANT", user.role)) {
    throw new Error("Only the consultant engineer may certify measurements.");
  }

  await transitionMeasurement(parsed.measurementId, ["SUBMITTED"], "CERTIFIED");
  await audit({ userId: user.id, entityType: "MeasurementEntry", entityId: parsed.measurementId, action: "APPROVE", diff: { status: "CERTIFIED" } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

export async function payMeasurement(formData: FormData) {
  const user = await requireUser();
  const parsed = statusActionSchema.parse({
    projectId: formData.get("projectId"),
    measurementId: formData.get("measurementId"),
  });
  await requireContractor(user, parsed.projectId);
  if (!canPayIpc(user.role)) throw new Error("Your role is not authorized to pay IPC certificates.");

  await transitionMeasurement(parsed.measurementId, ["CERTIFIED"], "PAID");
  await audit({ userId: user.id, entityType: "MeasurementEntry", entityId: parsed.measurementId, action: "APPROVE", diff: { status: "PAID" } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

// ---------------------------------------------------------------
// Variation orders (two-sided chain: contractor → consultant)
// ---------------------------------------------------------------

const variationSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().optional(),
  itemNo: z.string().min(1),
  workDescription: z.string().min(3),
  costImpact: z.coerce.number().nonnegative(),
  timeImpactDays: z.coerce.number().int().min(0).default(0),
});

export async function createVariation(formData: FormData) {
  const user = await requireUser();
  const parsed = variationSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId") || undefined,
    itemNo: formData.get("itemNo"),
    workDescription: formData.get("workDescription"),
    costImpact: formData.get("costImpact"),
    timeImpactDays: formData.get("timeImpactDays") || 0,
  });
  await requireContractor(user, parsed.projectId);
  if (!canPrepareVariation(user.role)) {
    throw new Error("Your role is not authorized to prepare variation orders.");
  }

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
  await audit({ userId: user.id, entityType: "VariationOrder", entityId: variation.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

const variationAdvanceSchema = z.object({
  projectId: z.string().min(1),
  variationId: z.string().min(1),
});

/**
 * Each step names its required predecessor status(es). This closes a real
 * gap: canCheckConsultantVariation and canApproveVariation are the same
 * predicate (a CONSULTANT_ENGINEER can do both), so without a status
 * precondition a consultant could call step="consultant_approve" on a
 * DRAFT/CONTRACTOR_PREPARED variation and skip both check stages entirely.
 */
const VARIATION_FLOW: Record<string, { target: VariationOrderStatus; from: VariationOrderStatus[] }> = {
  contractor_check: { target: "CONTRACTOR_CHECKED", from: ["DRAFT", "CONTRACTOR_PREPARED"] },
  consultant_check: { target: "CONSULTANT_CHECKED", from: ["CONTRACTOR_CHECKED"] },
  consultant_approve: { target: "CONSULTANT_APPROVED", from: ["CONSULTANT_CHECKED"] },
};

export async function advanceVariation(formData: FormData) {
  const user = await requireUser();
  const parsed = variationAdvanceSchema.parse({
    projectId: formData.get("projectId"),
    variationId: formData.get("variationId"),
  });
  const step = String(formData.get("step"));
  const transition = VARIATION_FLOW[step];
  if (!transition) throw new Error("Unknown variation step.");

  const party = await getProjectParty(user, parsed.projectId);
  if (!party) throw new Error("Not a member of this project.");

  const canAdvance =
    (step === "contractor_check" && canCheckContractorVariation(user.role)) ||
    ((step === "consultant_check" || step === "consultant_approve") &&
      (canCheckConsultantVariation(party.partyType, user.role) || canApproveVariation(party.partyType, user.role)));
  if (!canAdvance) {
    throw new Error("Your role is not authorized for this variation step.");
  }

  const result = await db.variationOrder.updateMany({
    where: { id: parsed.variationId, status: { in: transition.from } },
    data: { status: transition.target },
  });
  if (result.count === 0) {
    const current = await db.variationOrder.findUnique({ where: { id: parsed.variationId }, select: { status: true } });
    throw new Error(
      current
        ? `Cannot move variation from ${current.status} to ${transition.target} (expected: ${transition.from.join(", ")}).`
        : "Variation order not found."
    );
  }
  await audit({ userId: user.id, entityType: "VariationOrder", entityId: parsed.variationId, action: "APPROVE", diff: { status: transition.target } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}

export async function rejectVariation(formData: FormData) {
  const user = await requireUser();
  const parsed = variationAdvanceSchema.parse({
    projectId: formData.get("projectId"),
    variationId: formData.get("variationId"),
  });
  const party = await getProjectParty(user, parsed.projectId);
  if (!party || !canCheckConsultantVariation(party.partyType, user.role)) {
    throw new Error("Only the consultant may reject a variation order.");
  }

  await db.variationOrder.update({
    where: { id: parsed.variationId },
    data: { status: "REJECTED" },
  });
  await audit({ userId: user.id, entityType: "VariationOrder", entityId: parsed.variationId, action: "REJECT", diff: { status: "REJECTED" } });
  revalidatePath(`/projects/${parsed.projectId}/cost`);
}