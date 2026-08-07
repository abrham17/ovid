import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  createDispute,
  resolveDispute,
  listDisputes,
  getDispute,
} from "@/lib/services/dispute.service";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const projectId = new URL(req.url).searchParams.get("projectId");
    if (!projectId) return fail("projectId query param is required", 400);
    const status = new URL(req.url).searchParams.get("status") as
      | "OPEN"
      | "UNDER_REVIEW"
      | "RESOLVED"
      | null;
    return ok(await listDisputes(user, projectId, status ?? undefined));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create"),
    projectId: z.string().cuid(),
    defectLogId: z.string().cuid().optional(),
    itrId: z.string().cuid().optional(),
    wbsNodeId: z.string().cuid().optional(),
    reason: z.string().min(3),
    escalationTo: z.string().optional(),
  }),
  z.object({
    kind: z.literal("resolve"),
    disputeId: z.string().cuid(),
    resolution: z.string().min(3),
    resolvedStatus: z.enum(["UNDER_REVIEW", "RESOLVED"]),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const parsed = postSchema.parse(await parseJson(req));
    switch (parsed.kind) {
      case "create":
        return created(await createDispute(user, { ...parsed }));
      case "resolve":
        return ok(
          await resolveDispute(user, parsed.disputeId, parsed.resolution, parsed.resolvedStatus)
        );
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}