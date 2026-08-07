import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getWbsTree,
  createWbsNode,
  updateWbsNode,
  toggleDesignReady,
  deleteWbsNode,
} from "@/lib/services/project.service";
import { createWbsNodeSchema, updateWbsNodeSchema } from "@/lib/validations/project";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const tree = await getWbsTree(user, projectId);
    return ok(tree);
  } catch (err) {
    return handleApiError(err);
  }
}

const postBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: createWbsNodeSchema }),
  z.object({
    action: z.literal("update"),
    nodeId: z.string().cuid(),
    data: updateWbsNodeSchema,
  }),
  z.object({
    action: z.literal("toggle_design_ready"),
    nodeId: z.string().cuid(),
    designReady: z.boolean(),
  }),
  z.object({ action: z.literal("delete"), nodeId: z.string().cuid() }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);

    // Backward compatible: plain create body without action
    if (body && typeof body === "object" && !("action" in (body as object))) {
      const input = createWbsNodeSchema.parse(body);
      return created(await createWbsNode(user, projectId, input));
    }

    const parsed = postBodySchema.parse(body);

    if (parsed.action === "create") {
      return created(await createWbsNode(user, projectId, parsed.data));
    }
    if (parsed.action === "update") {
      return ok(await updateWbsNode(user, projectId, parsed.nodeId, parsed.data));
    }
    if (parsed.action === "toggle_design_ready") {
      return ok(
        await toggleDesignReady(user, projectId, parsed.nodeId, parsed.designReady)
      );
    }
    if (parsed.action === "delete") {
      await deleteWbsNode(user, projectId, parsed.nodeId);
      return ok({ deleted: true });
    }
    return fail("Unknown action", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
