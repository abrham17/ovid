import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { getInheritedDocuments } from "@/lib/services/document.service";
import { ok, handleApiError, fail } from "@/lib/api";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, _ctx: Ctx) {
  try {
    const user = await requireSession();
    const wbsNodeId = new URL(req.url).searchParams.get("wbsNodeId");
    const category = new URL(req.url).searchParams.get("category") ?? undefined;
    if (!wbsNodeId) return fail("wbsNodeId query param is required", 400);
    return ok(await getInheritedDocuments(user, wbsNodeId, category));
  } catch (err) {
    return handleApiError(err);
  }
}