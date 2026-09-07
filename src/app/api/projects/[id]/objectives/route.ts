import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, created, handleApiError, parseJson } from "@/lib/api";
import { addProjectObjective } from "@/lib/services/project.service";
import { db } from "@/lib/db";
import { assertProjectAccess } from "@/lib/permissions";
import { assertRoutePermission } from "@/lib/authorization";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id: projectId } = await params;

    await assertProjectAccess(user, projectId);
    assertRoutePermission(user, "GET", "/api/projects/:id/objectives");

    const objectives = await db.projectObjective.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return ok(objectives);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id: projectId } = await params;

    await assertProjectAccess(user, projectId);
    assertRoutePermission(user, "POST", "/api/projects/:id/objectives");

    const body = await parseJson<any>(req);
    const objective = await addProjectObjective(user, projectId, body);
    return created(objective);
  } catch (err) {
    return handleApiError(err);
  }
}
