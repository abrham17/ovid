import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { created, handleApiError, ok, parseJson } from "@/lib/api";
import { createDependencyRequest, listDependencyRequests, reviewDependencyRequest } from "@/lib/services/schedule.service";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession(); const { projectId } = await ctx.params;
    const status = new URL(req.url).searchParams.get("status") as "PENDING" | "APPROVED" | "DECLINED" | null;
    return ok(await listDependencyRequests(user, projectId, status ?? undefined));
  } catch (err) { return handleApiError(err); }
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), predecessorId: z.string().cuid(), successorId: z.string().cuid(), dependencyType: z.enum(["FS", "SS", "FF", "SF"]).optional(), lagDays: z.number().int().optional(), justification: z.string().min(3).max(2000) }),
  z.object({ action: z.literal("review"), requestId: z.string().cuid(), decision: z.enum(["approve", "decline"]), declineReason: z.string().optional() }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession(); const { projectId } = await ctx.params; const body = schema.parse(await parseJson(req));
    if (body.action === "create") return created(await createDependencyRequest(user, { projectId, predecessorId: body.predecessorId, successorId: body.successorId, dependencyType: body.dependencyType, lagDays: body.lagDays, justification: body.justification }));
    return ok(await reviewDependencyRequest(user, body.requestId, body.decision, body.declineReason));
  } catch (err) { return handleApiError(err); }
}
