import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listCostOverview,
  createBoqItem,
  createCostActual,
  createMeasurement,
  updateMeasurementStatus,
  createVariation,
  updateVariationStatus,
} from "@/lib/services/cost.service";
import {
  createBoqItemSchema,
  createCostActualSchema,
  createMeasurementSchema,
  createVariationSchema,
} from "@/lib/validations/cost";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listCostOverview(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boq"), data: createBoqItemSchema }),
  z.object({ kind: z.literal("actual"), data: createCostActualSchema }),
  z.object({ kind: z.literal("measurement"), data: createMeasurementSchema }),
  z.object({
    kind: z.literal("measurement_status"),
    measurementId: z.string().cuid(),
    status: z.enum(["DRAFT", "SUBMITTED", "CONSULTANT_QUERIED", "CERTIFIED", "PAID"]),
  }),
  z.object({ kind: z.literal("variation"), data: createVariationSchema }),
  z.object({
    kind: z.literal("variation_status"),
    variationId: z.string().cuid(),
    status: z.enum([
      "DRAFT",
      "CONTRACTOR_PREPARED",
      "CONTRACTOR_CHECKED",
      "CONSULTANT_CHECKED",
      "CONSULTANT_APPROVED",
      "REJECTED",
    ]),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);
    const parsed = postBodySchema.parse(body);

    switch (parsed.kind) {
      case "boq":
        return created(await createBoqItem(user, projectId, parsed.data));
      case "actual":
        return created(await createCostActual(user, projectId, parsed.data));
      case "measurement":
        return created(await createMeasurement(user, projectId, parsed.data));
      case "measurement_status":
        return ok(
          await updateMeasurementStatus(
            user,
            projectId,
            parsed.measurementId,
            parsed.status
          )
        );
      case "variation":
        return created(await createVariation(user, projectId, parsed.data));
      case "variation_status":
        return ok(
          await updateVariationStatus(
            user,
            projectId,
            parsed.variationId,
            parsed.status
          )
        );
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
