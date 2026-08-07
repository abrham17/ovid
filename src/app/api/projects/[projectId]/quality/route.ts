import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listQuality,
  createItr,
  createDefect,
  createPunch,
  updateDefectStatus,
  updatePunchStatus,
} from "@/lib/services/quality.service";
import {
  createItrSchema,
  createDefectSchema,
  createPunchSchema,
} from "@/lib/validations/quality";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listQuality(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("itr"), data: createItrSchema }),
  z.object({ kind: z.literal("defect"), data: createDefectSchema }),
  z.object({ kind: z.literal("punch"), data: createPunchSchema }),
  z.object({
    kind: z.literal("defect_status"),
    defectId: z.string().cuid(),
    status: z.enum(["OPEN", "REWORK_IN_PROGRESS", "VERIFIED_CLOSED"]),
  }),
  z.object({
    kind: z.literal("punch_status"),
    punchId: z.string().cuid(),
    status: z.enum(["OPEN", "RESOLVED", "VERIFIED"]),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));

    switch (parsed.kind) {
      case "itr":
        return created(await createItr(user, projectId, parsed.data));
      case "defect":
        return created(await createDefect(user, projectId, parsed.data));
      case "punch":
        return created(await createPunch(user, projectId, parsed.data));
      case "defect_status":
        return ok(
          await updateDefectStatus(user, projectId, parsed.defectId, parsed.status)
        );
      case "punch_status":
        return ok(
          await updatePunchStatus(user, projectId, parsed.punchId, parsed.status)
        );
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
