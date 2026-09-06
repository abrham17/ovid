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
  ensureCompanyApprovalRequest,
  ensureExecutiveCountersignature,
} from "@/lib/services/company-approval.service";
import {
  DomainError,
  assertNonNegative,
  assertStatusTransition,
  MEASUREMENT_TRANSITIONS,
  VARIATION_TRANSITIONS,
} from "@/lib/domain-rules";
import {
  getEffectiveScope,
  assertScopeWritable,
  scopeWbsFilter,
  redactCostList,
  isAll,
} from "@/lib/scope";

/**
 * Cost / BOQ / measurements / VOs.
 * Rates & margin stripped when !scope.canViewCostDetail (Site Engineer, Consultant, Client, Sub).
 */

export async function listCostOverview(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "read");

  const scope = await getEffectiveScope(user, projectId);
  const wbsFilter = scopeWbsFilter(scope);

  const contractWhere =
    user.partyType === "SUBCONTRACTOR"
      ? { projectId, contractorOrgId: user.organizationId }
      : { projectId };

  const [boqItems, measurements, variations, contracts] = await Promise.all([
    db.boqItem.findMany({
      where: { wbsNode: { projectId }, ...wbsFilter },
      orderBy: { itemCode: "asc" },
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        actuals: true,
      },
    }),
    db.measurementEntry.findMany({
      where: { wbsNode: { projectId }, ...wbsFilter },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        contract: { select: { id: true, scopeDescription: true, contractValue: true } },
      },
    }),
    db.variationOrder.findMany({
      where: {
        projectId,
        ...(isAll(scope.visibleWbsNodeIds)
          ? {}
          : {
              OR: [
                { wbsNodeId: null },
                { wbsNodeId: { in: [...scope.visibleWbsNodeIds] } },
              ],
            }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
    db.contract.findMany({
      where: contractWhere,
      orderBy: { createdAt: "asc" },
      include: {
        contractorOrg: { select: { id: true, name: true, partyType: true } },
      },
    }),
  ]);

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

  const redactedRows = redactCostList(rows as any[], scope);
  const redactedMeasurements = redactCostList(measurements as any[], scope);
  const redactedVariations = redactCostList(variations as any[], scope);
  const redactedContracts = redactCostList(contracts as any[], scope);

  return {
    boqItems: redactedRows,
    measurements: redactedMeasurements,
    variations: redactedVariations,
    contracts: redactedContracts,
    totals: scope.canViewCostDetail
      ? totals
      : { budgeted: null, committed: null, actual: null },
    canViewCostDetail: scope.canViewCostDetail,
  };
}

export async function createBoqItem(
  user: SessionUser,
  projectId: string,
  input: CreateBoqItemInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "cost", "create");
  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, input.wbsNodeId);

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

  if (status === "PAID") {
    const amount = Number(entry.quantity) * Number(entry.unitRate);
    const threshold = Number(process.env.HIGH_VALUE_IPC_THRESHOLD_ETB ?? 5000000);
    if (amount > threshold) {
      const gate = await ensureCompanyApprovalRequest(user, { type: "IPC_PAYMENT", entityType: "MeasurementEntry", entityId: entry.id, amount, comment: "High-value IPC requires treasury authorization", thresholdSnapshot: { threshold, projectId, certificateNo: entry.certificateNo } });
      if (!gate.approved) throw new DomainError(`Company finance approval request ${gate.pending.id} is pending`, 409);
    }
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

  if (status === "CONSULTANT_APPROVED" && Number(vo.costImpact ?? 0) > Number(process.env.HIGH_VALUE_VARIATION_THRESHOLD_ETB ?? 10000000)) {
    const threshold = Number(process.env.HIGH_VALUE_VARIATION_THRESHOLD_ETB ?? 10000000);
    const gate = await ensureCompanyApprovalRequest(user, { type: "HIGH_VALUE_VARIATION", entityType: "VariationOrder", entityId: vo.id, amount: Number(vo.costImpact), comment: "High-value variation requires company legal review", thresholdSnapshot: { threshold, projectId, itemNo: vo.itemNo } });
    if (!gate.approved) throw new DomainError(`Company legal approval request ${gate.pending.id} is pending`, 409);
    const executiveThreshold = Number(process.env.GM_VARIATION_COUNTERSIGN_THRESHOLD_ETB ?? 25000000);
    if (Number(vo.costImpact) >= executiveThreshold) {
      const executiveGate = await ensureExecutiveCountersignature(user, {
        type: "EXECUTIVE_VARIATION",
        entityType: "VariationOrder",
        entityId: vo.id,
        amount: Number(vo.costImpact),
        comment: "General Manager countersignature required for this variation value",
        thresholdSnapshot: { threshold: executiveThreshold, projectId, itemNo: vo.itemNo },
      });
      if (!executiveGate.approved) throw new DomainError(`General Manager countersignature ${executiveGate.pending.id} is pending`, 409);
    }
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
