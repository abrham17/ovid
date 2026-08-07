import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listDocuments,
  createDocument,
  updateDocumentStatus,
} from "@/lib/services/document.service";
import { createDocumentSchema } from "@/lib/validations/document";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listDocuments(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), data: createDocumentSchema }),
  z.object({
    kind: z.literal("status"),
    documentId: z.string().cuid(),
    status: z.enum(["DRAFT", "UNDER_REVIEW", "ISSUED", "SUPERSEDED", "WITHDRAWN"]),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));

    if (parsed.kind === "create") {
      return created(await createDocument(user, projectId, parsed.data));
    }
    if (parsed.kind === "status") {
      return ok(
        await updateDocumentStatus(user, projectId, parsed.documentId, parsed.status)
      );
    }
    return fail("Unknown kind", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
