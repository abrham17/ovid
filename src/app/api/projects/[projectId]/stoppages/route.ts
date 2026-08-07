import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listStoppages,
  createStoppage,
  assignResponsibility,
} from "@/lib/services/stoppage.service";
import { createStoppageSchema } from "@/lib/validations/stoppage";
import { ok, created, handleApiError, parseJson } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const sp = new URL(req.url).searchParams;
    const data = await listStoppages(user, projectId, {
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      type: sp.get("type") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);

    // Assign responsibility action
    if (body && typeof body === "object" && (body as any).action === "assign") {
      const schema = z.object({
        action: z.literal("assign"),
        stoppageId: z.string().cuid(),
        responsibleParty: z.enum([
          "CLIENT",
          "CONSULTANT",
          "CONTRACTOR",
          "SUBCONTRACTOR",
          "NEUTRAL",
        ]),
      });
      const parsed = schema.parse(body);
      const entry = await assignResponsibility(
        user,
        parsed.stoppageId,
        parsed.responsibleParty
      );
      return ok(entry);
    }

    const input = createStoppageSchema.parse({ ...(body as object), projectId });
    const entry = await createStoppage(user, input);
    return created(entry);
  } catch (err) {
    return handleApiError(err);
  }
}
