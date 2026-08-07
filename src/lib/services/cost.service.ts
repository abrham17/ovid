import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateBoqItemInput,
  CreateCostActualInput,
  CreateMeasurementInput,
  CreateVariationInput,
} from "@/lib/validations/cost";
import { Prisma } from "@/generated/prisma/client";
import {
  DomainError,
  assertNonNegative,
  assertStatusTransition,
  MEASUREMENT_TRANSITIONS,
  VARIATION_TRANSITIONS,
} from "@/lib/domain-rules";

/**
 * Phase 2 — Cost, BOQ, IPC measurements, Variation Orders for Ovid.
 * Party-type rules: margin/unit rates hidden from CLIENT/CONSULTANT where appropriate
 * is enforced at UI; here we gate by RBAC cost/measurement permissions.
 */

export async function listCostOverview(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "read");

  const [boqItems, measurements, variations, contracts] = await Promise.all([
    db.boqItem.findMany({
      where: { wbsNode: { projectId } },
      orderBy: { itemCode: "asc" },
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        actuals: true,
      },
    }),
    db.measurementEntry.findMany({
      where: { wbsNode: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, scopeDescription: true, contractValue: true } },
      },
    }),
    db.variationOrder.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
    db.contract.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: {
        contractorOrg: { select: { id: true, name: true, partyType: true } },
      },
    }),
  ]);

  // Budget vs actual rollup
  const rows = boqItems.map((item) => {
    const budgeted = Number(item.budgetedQuantity) * Number(item.unitRate);
    const committed = item.actuals
      .filter((a) => a.costType === "COMMITTED")
      .reduce((s, a) => s + Number(a.amount), 0);
    const actual = item.actuals
      .filter((a) => a.costType === "ACTUAL")
      .reduce((s, a) => s + Number(a.amount), 0);
    return {
      ...item,
      budgetedAmount: budgeted,
      committedAmount: committed,
      actualAmount: actual,
      variance: budgeted - actual,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.budgeted += r.budgetedAmount;
      acc.committed += r.committedAmount;
      acc.actual += r.actualAmount;
      return acc;
    },
    { budgeted: 0, committed: 0, actual: 0 }
  );

  return { boqItems: rows, measurements, variations, contracts, totals };
}

export async function createBoqItem(
  user: SessionUser,
  projectId: string,
  input: CreateBoqItemInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "create");

  const wbs = await db.wbsNode.findFirst({
    where: { id: input.wbsNodeId, projectId },
  });
  if (!wbs) throw new Error("WBS node not found on this project");

  assertNonNegative(input.budgetedQuantity, "Budgeted quantity");
  assertNonNegative(input.unitRate, "Unit rate");

  return db.boqItem.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      itemCode: input.itemCode,
      description: input.description,
      unit: input.unit,
      budgetedQuantity: new Prisma.Decimal(input.budgetedQuantity),
      unitRate: new Prisma.Decimal(input.unitRate),
    },
  });
}

export async function createCostActual(
  user: SessionUser,
  projectId: string,
  input: CreateCostActualInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "create");

  const item = await db.boqItem.findFirst({
    where: { id: input.boqItemId, wbsNode: { projectId } },
  });
  if (!item) throw new Error("BOQ item not found on this project");

  return db.costActual.create({
    data: {
      boqItemId: input.boqItemId,
      costType: input.costType,
      amount: new Prisma.Decimal(input.amount),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      recordedAt: new Date(input.recordedAt),
    },
  });
}

export async function createMeasurement(
  user: SessionUser,
  projectId: string,
  input: CreateMeasurementInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "measurement", "create");

  const [contract, wbs] = await Promise.all([
    db.contract.findFirst({ where: { id: input.contractId, projectId } }),
    db.wbsNode.findFirst({ where: { id: input.wbsNodeId, projectId } }),
  ]);
  if (!contract) throw new Error("Contract not found on this project");
  if (!wbs) throw new Error("WBS node not found on this project");
  assertNonNegative(input.quantity, "Quantity");
  assertNonNegative(input.unitRate, "Unit rate");

  return db.measurementEntry.create({
    data: {
      contractId: input.contractId,
      wbsNodeId: input.wbsNodeId,
      itemNo: input.itemNo,
      locationFrom: input.locationFrom,
      locationTo: input.locationTo,
      side: input.side,
      length: input.length != null ? new Prisma.Decimal(input.length) : null,
      width: input.width != null ? new Prisma.Decimal(input.width) : null,
      depth: input.depth != null ? new Prisma.Decimal(input.depth) : null,
      quantity: new Prisma.Decimal(input.quantity),
      unitRate: new Prisma.Decimal(input.unitRate),
      certificateNo: input.certificateNo,
      status: "DRAFT",
    },
  });
}

/** IPC status progression: DRAFT → SUBMITTED → CONSULTANT_QUERIED → CERTIFIED → PAID */
export async function updateMeasurementStatus(
  user: SessionUser,
  projectId: string,
  measurementId: string,
  status: "DRAFT" | "SUBMITTED" | "CONSULTANT_QUERIED" | "CERTIFIED" | "PAID"
) {
  await assertProjectAccess(user, projectId);

  const entry = await db.measurementEntry.findFirst({
    where: { id: measurementId, wbsNode: { projectId } },
  });
  if (!entry) throw new Error("Measurement not found");

  assertStatusTransition(entry.status, status, MEASUREMENT_TRANSITIONS, "IPC status");

  if (status === "CERTIFIED" || status === "PAID") {
    assertPermission(user, "measurement", "approve");
  } else {
    assertPermission(user, "measurement", "update");
  }

  return db.measurementEntry.update({
    where: { id: measurementId },
    data: { status },
  });
}

export async function createVariation(
  user: SessionUser,
  projectId: string,
  input: CreateVariationInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "create");

  if (input.wbsNodeId) {
    const wbs = await db.wbsNode.findFirst({
      where: { id: input.wbsNodeId, projectId },
    });
    if (!wbs) throw new Error("WBS node not found");
  }

  return db.variationOrder.create({
    data: {
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      itemNo: input.itemNo,
      workDescription: input.workDescription,
      equipmentUsed: input.equipmentUsed ?? undefined,
      manpowerUsed: input.manpowerUsed ?? undefined,
      materialUsed: input.materialUsed ?? undefined,
      costImpact:
        input.costImpact != null ? new Prisma.Decimal(input.costImpact) : null,
      timeImpactDays: input.timeImpactDays ?? null,
      status: "DRAFT",
    },
  });
}

/** VO approval chain (Aser Day Work style). */
export async function updateVariationStatus(
  user: SessionUser,
  projectId: string,
  variationId: string,
  status:
    | "DRAFT"
    | "CONTRACTOR_PREPARED"
    | "CONTRACTOR_CHECKED"
    | "CONSULTANT_CHECKED"
    | "CONSULTANT_APPROVED"
    | "REJECTED"
) {
  await assertProjectAccess(user, projectId);

  const vo = await db.variationOrder.findFirst({
    where: { id: variationId, projectId },
  });
  if (!vo) throw new Error("Variation order not found");

  assertStatusTransition(vo.status, status, VARIATION_TRANSITIONS, "Variation status");

  if (status === "CONSULTANT_APPROVED" || status === "REJECTED") {
    assertPermission(user, "cost", "approve");
  } else {
    assertPermission(user, "cost", "update");
  }

  return db.variationOrder.update({
    where: { id: variationId },
    data: { status },
  });
}

export async function listContracts(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "read");
  return db.contract.findMany({
    where: { projectId },
    include: {
      contractorOrg: { select: { id: true, name: true, partyType: true } },
    },
  });
}
