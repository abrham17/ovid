import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { assignToActivity, unassignFromActivity, listActivityAssignments } from "@/lib/services/assignment.service";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const activityId = new URL(req.url).searchParams.get("activityId");
    if (!activityId) return fail("activityId query param is required", 400);
    return ok(await listActivityAssignments(user, activityId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("assign"),
    activityId: z.string().cuid(),
    userId: z.string().cuid(),
    role: z.enum(["SITE_ENGINEER", "FOREMAN"]),
  }),
  z.object({
    kind: z.literal("unassign"),
    assignmentId: z.string().cuid(),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));
    switch (parsed.kind) {
      case "assign":
        return created(await assignToActivity(user, parsed.activityId, parsed.userId, parsed.role));
      case "unassign":
        return ok(await unassignFromActivity(user, parsed.assignmentId));
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}