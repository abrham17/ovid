import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, handleApiError, parseJson } from "@/lib/api";
import { transitionProjectStatus } from "@/lib/services/project.service";
import { assertProjectAccess } from "@/lib/permissions";
import { assertRoutePermission } from "@/lib/authorization";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id: projectId } = await params;

    await assertProjectAccess(user, projectId);
    assertRoutePermission(user, "POST", "/api/projects/:id/transition");

    const body = await parseJson<any>(req);
    const updated = await transitionProjectStatus(
      user,
      projectId,
      body.targetStatus,
      body.reason ?? "Phase gate transition"
    );
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
