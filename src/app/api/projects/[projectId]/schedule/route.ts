import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listActivities,
  createActivity,
  updateActivity,
  createDependency,
} from "@/lib/services/schedule.service";
import {
  createActivitySchema,
  updateActivitySchema,
  createDependencySchema,
} from "@/lib/validations/schedule";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const data = await listActivities(user, projectId);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

const postBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("activity"), data: createActivitySchema }),
  z.object({ kind: z.literal("dependency"), data: createDependencySchema }),
  z.object({
    kind: z.literal("update_activity"),
    activityId: z.string().cuid(),
    data: updateActivitySchema,
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);
    const parsed = postBodySchema.parse(body);

    if (parsed.kind === "activity") {
      return created(await createActivity(user, projectId, parsed.data));
    }
    if (parsed.kind === "dependency") {
      return created(await createDependency(user, parsed.data));
    }
    if (parsed.kind === "update_activity") {
      return ok(await updateActivity(user, parsed.activityId, parsed.data));
    }
    return fail("Unknown kind", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
