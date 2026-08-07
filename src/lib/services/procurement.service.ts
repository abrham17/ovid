import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateMaterialInput,
  CreatePOInput,
  CreateBidInput,
  CreateReceiptInput,
} from "@/lib/validations/procurement";
import { Prisma } from "@/generated/prisma/client";
import {
  DomainError,
  assertNonNegative,
  assertStatusTransition,
  PO_TRANSITIONS,
  BID_TRANSITIONS,
} from "@/lib/domain-rules";

export async function listProcurement(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "read");

  const [purchaseOrders, bids, materials, receipts, suppliers] = await Promise.all([
    db.purchaseOrder.findMany({
      where: { projectId },
      orderBy: { issueDate: "desc" },
      take: 50,
      include: {
        supplier: { select: { id: true, name: true, partyType: true } },
        items: {
          include: {
            materialItem: { select: { id: true, name: true, unit: true } },
          },
        },
        _count: { select: { receipts: true } },
      },
    }),
    db.bidTender.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        supplier: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, fullName: true } },
      },
    }),
    db.materialItem.findMany({ orderBy: { name: "asc" }, take: 100 }),
    db.materialReceipt.findMany({
      where: { projectId },
      orderBy: { receiptDate: "desc" },
      take: 40,
      include: {
        materialItem: { select: { id: true, name: true, unit: true } },
        receivedBy: { select: { id: true, fullName: true } },
      },
    }),
    db.organization.findMany({
      where: { partyType: { in: ["SUPPLIER", "SUBCONTRACTOR"] } },
      select: { id: true, name: true, partyType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { purchaseOrders, bids, materials, receipts, suppliers };
}

export async function createMaterial(
  user: SessionUser,
  projectId: string,
  input: CreateMaterialInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "create");

  return db.materialItem.create({
    data: {
      name: input.name,
      unit: input.unit,
      importDependent: input.importDependent ?? false,
    },
  });
}

export async function createPurchaseOrder(
  user: SessionUser,
  projectId: string,
  input: CreatePOInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "create");

  return db.purchaseOrder.create({
    data: {
      projectId,
      supplierOrgId: input.supplierOrgId,
      poNo: input.poNo,
      expectedDelivery: input.expectedDelivery
        ? new Date(input.expectedDelivery)
        : null,
      amount: input.amount != null ? new Prisma.Decimal(input.amount) : null,
      status: "DRAFT",
      items: {
        create: (input.items ?? []).map((item) => ({
          materialItemId: item.materialItemId,
          quantityOrdered: new Prisma.Decimal(item.quantityOrdered),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          wbsNodeId: item.wbsNodeId ?? null,
        })),
      },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: true,
    },
  });
}

export async function updatePOStatus(
  user: SessionUser,
  projectId: string,
  poId: string,
  status:
    | "DRAFT"
    | "APPROVED"
    | "ISSUED"
    | "PARTIAL_RECEIVED"
    | "RECEIVED"
    | "CLOSED"
    | "CANCELLED"
) {
  await assertProjectAccess(user, projectId);

  const po = await db.purchaseOrder.findFirst({
    where: { id: poId, projectId },
  });
  if (!po) throw new Error("Purchase order not found");
  assertStatusTransition(po.status, status, PO_TRANSITIONS, "PO status");

  if (status === "APPROVED" || status === "ISSUED") {
    assertPermission(user, "procurement", "approve");
  } else {
    assertPermission(user, "procurement", "update");
  }

  return db.purchaseOrder.update({
    where: { id: poId },
    data: { status },
  });
}

export async function createBid(
  user: SessionUser,
  projectId: string,
  input: CreateBidInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "create");

  return db.bidTender.create({
    data: {
      projectId,
      supplierOrgId: input.supplierOrgId ?? null,
      bidNo: input.bidNo,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount != null ? new Prisma.Decimal(input.amount) : null,
      result: "DRAFT",
      submittedByUserId: user.id,
    },
  });
}

export async function updateBidStatus(
  user: SessionUser,
  projectId: string,
  bidId: string,
  result: "DRAFT" | "SUBMITTED" | "WON" | "LOST" | "CANCELLED"
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "update");

  const bid = await db.bidTender.findFirst({
    where: { id: bidId, projectId },
  });
  if (!bid) throw new Error("Bid not found");
  assertStatusTransition(bid.result, result, BID_TRANSITIONS, "Bid status");

  return db.bidTender.update({
    where: { id: bidId },
    data: {
      result,
      submittedAt: result === "SUBMITTED" ? new Date() : bid.submittedAt,
    },
  });
}

export async function createReceipt(
  user: SessionUser,
  projectId: string,
  input: CreateReceiptInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "procurement", "create");

  const po = await db.purchaseOrder.findFirst({
    where: { id: input.purchaseOrderId, projectId },
    include: { items: true },
  });
  if (!po) throw new Error("PO not found");
  assertNonNegative(input.quantityReceived, "Quantity received");

  const receipt = await db.materialReceipt.create({
    data: {
      purchaseOrderId: input.purchaseOrderId,
      materialItemId: input.materialItemId,
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      quantityReceived: new Prisma.Decimal(input.quantityReceived),
      receiptDate: new Date(input.receiptDate),
      receivedByUserId: user.id,
      remark: input.remark ?? null,
    },
  });

  // Bump quantityReceived on matching PO line
  const line = po.items.find((i) => i.materialItemId === input.materialItemId);
  if (line) {
    const newQty = Number(line.quantityReceived) + input.quantityReceived;
    await db.purchaseOrderItem.update({
      where: { id: line.id },
      data: { quantityReceived: new Prisma.Decimal(newQty) },
    });
    const allReceived = po.items.every((i) => {
      const q =
        i.id === line.id
          ? newQty
          : Number(i.quantityReceived);
      return q >= Number(i.quantityOrdered);
    });
    await db.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: allReceived ? "RECEIVED" : "PARTIAL_RECEIVED",
      },
    });
  }

  return receipt;
}
