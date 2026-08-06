"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  getProjectParty,
  canManagePurchaseOrders,
  canApprovePurchaseOrder,
  canRecordReceipt,
  canManageBids,
} from "@/lib/rbac";
import type { SessionUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { ok, fail, runAction, type ActionResult } from "@/lib/action-result";
import type { BidStatus, POStatus } from "@/generated/prisma/enums";
import { assertWbsNodeVisibleToUser } from "@/lib/actions/project-guards";

/**
 * Purchase orders, receipts, and bids are all created/managed BY the
 * contractor ABOUT a supplier (file 09 §2: Supplier's tab ceiling is
 * read-oriented — "overview, documents, procurement" — not a write role).
 * Every write action in this file is contractor-side; a Supplier-org user
 * should never reach these mutations regardless of their functional role.
 */
async function requireContractor(user: SessionUser, projectId: string) {
  const party = await getProjectParty(user, projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may manage procurement records.");
  }
  return party;
}

export async function createPurchaseOrder(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const schema = z.object({
      projectId: z.string().min(1),
      supplierOrgId: z.string().min(1),
      poNo: z.string().min(1),
      expectedDelivery: z.coerce.date().optional(),
      materialItemId: z.string().min(1),
      quantityOrdered: z.coerce.number().positive(),
      unitPrice: z.coerce.number().min(0),
      wbsNodeId: z.string().optional(),
      materialDemandId: z.string().optional(),
    });
    const parsed = schema.parse({
      projectId: formData.get("projectId"),
      supplierOrgId: formData.get("supplierOrgId"),
      poNo: formData.get("poNo"),
      expectedDelivery: formData.get("expectedDelivery") || undefined,
      materialItemId: formData.get("materialItemId"),
      quantityOrdered: formData.get("quantityOrdered"),
      unitPrice: formData.get("unitPrice"),
      wbsNodeId: formData.get("wbsNodeId") || undefined,
      materialDemandId: formData.get("materialDemandId") || undefined,
    });
    await requireContractor(user, parsed.projectId);
    if (!canManagePurchaseOrders(user.role)) {
      return fail("Your role cannot create purchase orders.");
    }
    await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);
    if (parsed.materialDemandId) {
      const demand = await db.materialDemand.findFirst({
        where: { id: parsed.materialDemandId, wbsNode: { projectId: parsed.projectId } },
        select: { id: true },
      });
      if (!demand) return fail("Selected material demand is not in this project.");
    }

    const amount = parsed.quantityOrdered * parsed.unitPrice;

    const po = await db.purchaseOrder.create({
      data: {
        projectId: parsed.projectId,
        supplierOrgId: parsed.supplierOrgId,
        poNo: parsed.poNo,
        expectedDelivery: parsed.expectedDelivery,
        amount,
        status: "DRAFT",
        items: {
          create: {
            materialItemId: parsed.materialItemId,
            materialDemandId: parsed.materialDemandId,
            wbsNodeId: parsed.wbsNodeId,
            quantityOrdered: parsed.quantityOrdered,
            unitPrice: parsed.unitPrice,
          },
        },
      },
    });
    await audit({
      userId: user.id,
      entityType: "PurchaseOrder",
      entityId: po.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/procurement`);
    return ok("Purchase order created.");
  });
}

export async function approvePurchaseOrder(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") ?? "");
    const purchaseOrderId = String(formData.get("purchaseOrderId") ?? "");
    await requireContractor(user, projectId);
    if (!canApprovePurchaseOrder(user.role)) {
      return fail("Your role cannot approve purchase orders.");
    }
    const existing = await db.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, projectId },
      select: { id: true },
    });
    if (!existing) return fail("Purchase order is not in this project.");
    const po = await db.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "APPROVED" as POStatus },
    });
    await audit({
      userId: user.id,
      entityType: "PurchaseOrder",
      entityId: po.id,
      action: "APPROVE",
      diff: { status: "APPROVED" },
    });
    revalidatePath(`/projects/${projectId}/procurement`);
    return ok("Purchase order approved.");
  });
}

export async function issuePurchaseOrder(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") ?? "");
    const purchaseOrderId = String(formData.get("purchaseOrderId") ?? "");
    await requireContractor(user, projectId);
    if (!canManagePurchaseOrders(user.role)) {
      return fail("Your role cannot issue purchase orders.");
    }
    const existing = await db.purchaseOrder.findFirst({ where: { id: purchaseOrderId, projectId } });
    if (!existing || existing.status !== "APPROVED") {
      return fail("Only approved POs can be issued.");
    }
    await db.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "ISSUED" },
    });
    await audit({
      userId: user.id,
      entityType: "PurchaseOrder",
      entityId: purchaseOrderId,
      action: "UPDATE",
      diff: { status: "ISSUED" },
    });
    revalidatePath(`/projects/${projectId}/procurement`);
    return ok("Purchase order issued.");
  });
}

export async function recordMaterialReceipt(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const schema = z.object({
      projectId: z.string().min(1),
      purchaseOrderId: z.string().min(1),
      materialItemId: z.string().min(1),
      quantityReceived: z.coerce.number().positive(),
      receiptDate: z.coerce.date(),
      wbsNodeId: z.string().optional(),
      remark: z.string().optional(),
    });
    const parsed = schema.parse({
      projectId: formData.get("projectId"),
      purchaseOrderId: formData.get("purchaseOrderId"),
      materialItemId: formData.get("materialItemId"),
      quantityReceived: formData.get("quantityReceived"),
      receiptDate: formData.get("receiptDate"),
      wbsNodeId: formData.get("wbsNodeId") || undefined,
      remark: formData.get("remark") || undefined,
    });
    await requireContractor(user, parsed.projectId);
    if (!canRecordReceipt(user.role)) {
      return fail("Your role cannot record receipts.");
    }
    await assertWbsNodeVisibleToUser(user, parsed.projectId, parsed.wbsNodeId);
    const po = await db.purchaseOrder.findFirst({
      where: { id: parsed.purchaseOrderId, projectId: parsed.projectId },
      select: { id: true },
    });
    if (!po) return fail("Purchase order is not in this project.");

    const receipt = await db.materialReceipt.create({
      data: {
        purchaseOrderId: parsed.purchaseOrderId,
        materialItemId: parsed.materialItemId,
        wbsNodeId: parsed.wbsNodeId,
        projectId: parsed.projectId,
        quantityReceived: parsed.quantityReceived,
        receiptDate: parsed.receiptDate,
        receivedByUserId: user.id,
        remark: parsed.remark,
      },
    });

    const item = await db.purchaseOrderItem.findFirst({
      where: {
        purchaseOrderId: parsed.purchaseOrderId,
        materialItemId: parsed.materialItemId,
      },
    });
    if (item) {
      await db.purchaseOrderItem.update({
        where: { id: item.id },
        data: {
          quantityReceived: Number(item.quantityReceived) + parsed.quantityReceived,
        },
      });
    }

    const items = await db.purchaseOrderItem.findMany({
      where: { purchaseOrderId: parsed.purchaseOrderId },
    });
    const allReceived = items.every(
      (i) => Number(i.quantityReceived) >= Number(i.quantityOrdered)
    );
    const anyReceived = items.some((i) => Number(i.quantityReceived) > 0);
    await db.purchaseOrder.update({
      where: { id: parsed.purchaseOrderId },
      data: {
        status: allReceived ? "RECEIVED" : anyReceived ? "PARTIAL_RECEIVED" : "ISSUED",
      },
    });

    await audit({
      userId: user.id,
      entityType: "MaterialReceipt",
      entityId: receipt.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/procurement`);
    return ok("Receipt recorded.");
  });
}

export async function createBid(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const schema = z.object({
      projectId: z.string().min(1),
      bidNo: z.string().min(1),
      title: z.string().min(2),
      description: z.string().optional(),
      supplierOrgId: z.string().optional(),
      amount: z.coerce.number().optional(),
    });
    const parsed = schema.parse({
      projectId: formData.get("projectId"),
      bidNo: formData.get("bidNo"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      supplierOrgId: formData.get("supplierOrgId") || undefined,
      amount: formData.get("amount") || undefined,
    });
    await requireContractor(user, parsed.projectId);
    if (!canManageBids(user.role)) {
      return fail("Your role cannot manage bids.");
    }

    const bid = await db.bidTender.create({
      data: {
        projectId: parsed.projectId,
        bidNo: parsed.bidNo,
        title: parsed.title,
        description: parsed.description,
        supplierOrgId: parsed.supplierOrgId,
        amount: parsed.amount,
        result: "DRAFT",
        submittedByUserId: user.id,
      },
    });
    await audit({
      userId: user.id,
      entityType: "BidTender",
      entityId: bid.id,
      action: "CREATE",
      diff: parsed,
    });
    revalidatePath(`/projects/${parsed.projectId}/procurement`);
    return ok("Bid recorded.");
  });
}

export async function updateBidResult(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const projectId = String(formData.get("projectId") ?? "");
    const bidId = String(formData.get("bidId") ?? "");
    const result = String(formData.get("result") ?? "") as BidStatus;
    await requireContractor(user, projectId);
    if (!canManageBids(user.role)) {
      return fail("Your role cannot manage bids.");
    }
    const existing = await db.bidTender.findFirst({
      where: { id: bidId, projectId },
      select: { id: true },
    });
    if (!existing) return fail("Bid is not in this project.");
    if (!["SUBMITTED", "WON", "LOST", "CANCELLED"].includes(result)) {
      return fail("Invalid bid result.");
    }
    await db.bidTender.update({
      where: { id: bidId },
      data: {
        result,
        submittedAt: result === "SUBMITTED" ? new Date() : undefined,
      },
    });
    await audit({
      userId: user.id,
      entityType: "BidTender",
      entityId: bidId,
      action: "UPDATE",
      diff: { result },
    });
    revalidatePath(`/projects/${projectId}/procurement`);
    return ok("Bid updated.");
  });
}
