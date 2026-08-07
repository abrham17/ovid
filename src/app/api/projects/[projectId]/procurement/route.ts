import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listProcurement,
  createMaterial,
  createPurchaseOrder,
  updatePOStatus,
  createBid,
  updateBidStatus,
  createReceipt,
} from "@/lib/services/procurement.service";
import {
  createMaterialSchema,
  createPOSchema,
  createBidSchema,
  createReceiptSchema,
} from "@/lib/validations/procurement";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listProcurement(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("material"), data: createMaterialSchema }),
  z.object({ kind: z.literal("po"), data: createPOSchema }),
  z.object({
    kind: z.literal("po_status"),
    poId: z.string().cuid(),
    status: z.enum([
      "DRAFT",
      "APPROVED",
      "ISSUED",
      "PARTIAL_RECEIVED",
      "RECEIVED",
      "CLOSED",
      "CANCELLED",
    ]),
  }),
  z.object({ kind: z.literal("bid"), data: createBidSchema }),
  z.object({
    kind: z.literal("bid_status"),
    bidId: z.string().cuid(),
    result: z.enum(["DRAFT", "SUBMITTED", "WON", "LOST", "CANCELLED"]),
  }),
  z.object({ kind: z.literal("receipt"), data: createReceiptSchema }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));

    switch (parsed.kind) {
      case "material":
        return created(await createMaterial(user, projectId, parsed.data));
      case "po":
        return created(await createPurchaseOrder(user, projectId, parsed.data));
      case "po_status":
        return ok(await updatePOStatus(user, projectId, parsed.poId, parsed.status));
      case "bid":
        return created(await createBid(user, projectId, parsed.data));
      case "bid_status":
        return ok(await updateBidStatus(user, projectId, parsed.bidId, parsed.result));
      case "receipt":
        return created(await createReceipt(user, projectId, parsed.data));
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
