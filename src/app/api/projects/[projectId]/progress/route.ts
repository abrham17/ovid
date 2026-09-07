import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  computeActivityProgress,
  computeWbsProgress,
  computeProjectProgress,
  getProjectHealth,
} from "@/lib/services/progress.service";
import { ok, handleApiError, fail } from "@/lib/api";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const scope = new URL(req.url).searchParams.get("scope") ?? "project";
    const wbsNodeId = new URL(req.url).searchParams.get("wbsNodeId");

    switch (scope) {
      case "health":
        return ok(await getProjectHealth(projectId, user));
      case "wbs": {
        if (!wbsNodeId) return fail("wbsNodeId required for scope=wbs", 400);
        return ok({ progressPercent: await computeWbsProgress(wbsNodeId, user) });
      }
      case "activity": {
        const activityId = new URL(req.url).searchParams.get("activityId") ?? wbsNodeId;
        if (!activityId) return fail("activityId required for scope=activity", 400);
        return ok({ progressPercent: await computeActivityProgress(activityId) });
      }
      case "project":
      default:
        return ok({ progressPercent: await computeProjectProgress(projectId, user) });
    }
  } catch (err) {
    return handleApiError(err);
  }
}