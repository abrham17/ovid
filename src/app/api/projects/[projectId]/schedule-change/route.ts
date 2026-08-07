import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  createScheduleChangeRequest,
  reviewScheduleChangeRequest,
  listScheduleChangeRequests,
} from "@/lib/services/review.service";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    return ok(await listScheduleChangeRequests(user, projectId, status));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create"),
    activityId: z.string().cuid(),
    newStart: z.string().datetime(),
    newFinish: z.string().datetime(),
    reason: z.string().min(3),
  }),
  z.object({
    kind: z.literal("review"),
    requestId: z.string().cuid(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    decisionReason: z.string().optional(),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));
    switch (parsed.kind) {
      case "create":
        return created(
          await createScheduleChangeRequest(user, {
            projectId,
            activityId: parsed.activityId,
            newStart: new Date(parsed.newStart),
            newFinish: new Date(parsed.newFinish),
            reason: parsed.reason,
          })
        );
      case "review":
        return ok(
          await reviewScheduleChangeRequest(user, parsed.requestId, parsed.decision, parsed.decisionReason)
        );
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}