import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { listRisks, createRisk, updateRisk, realizeRisk } from "@/lib/services/risk.service";
import { createRiskSchema, updateRiskSchema } from "@/lib/validations/risk";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listRisks(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), data: createRiskSchema }),
  z.object({
    kind: z.literal("update"),
    riskId: z.string().cuid(),
    data: updateRiskSchema,
  }),
  z.object({
    kind: z.literal("realize"),
    riskId: z.string().cuid(),
    stoppageId: z.string().cuid().optional(),
    variationId: z.string().cuid().optional(),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);
    const parsed = postBodySchema.parse(body);

    if (parsed.kind === "create") {
      return created(await createRisk(user, projectId, parsed.data));
    }
    if (parsed.kind === "update") {
      return ok(await updateRisk(user, projectId, parsed.riskId, parsed.data));
    }
    if (parsed.kind === "realize") {
      return ok(
        await realizeRisk(user, projectId, parsed.riskId, {
          stoppageId: parsed.stoppageId,
          variationId: parsed.variationId,
        })
      );
    }
    return fail("Unknown kind", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
