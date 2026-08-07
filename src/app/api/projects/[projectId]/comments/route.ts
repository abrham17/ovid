import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { addReviewComment, getEntityComments } from "@/lib/services/review.service";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const entityType = new URL(req.url).searchParams.get("entityType");
    const entityId = new URL(req.url).searchParams.get("entityId");
    if (!entityType || !entityId) return fail("entityType and entityId are required", 400);
    return ok(await getEntityComments(user, entityType, entityId, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  body: z.string().min(1),
  parentId: z.string().optional(),
  isDecision: z.boolean().optional(),
  decisionLabel: z.string().optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));
    return created(
      await addReviewComment(user, { projectId, ...parsed })
    );
  } catch (err) {
    return handleApiError(err);
  }
}