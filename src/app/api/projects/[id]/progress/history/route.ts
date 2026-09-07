import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, created, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { recordProgressSnapshot } from "@/lib/services/progress.service";
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
    assertRoutePermission(user, "GET", "/api/projects/:id/progress/history");

    const snapshots = await db.progressSnapshot.findMany({
      where: { projectId },
      orderBy: { snapshotDate: "asc" },
    });

    return ok(snapshots);
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
    assertRoutePermission(user, "POST", "/api/projects/:id/progress/history");

    const snapshot = await recordProgressSnapshot(projectId, user.id);
    return created(snapshot);
  } catch (err) {
    return handleApiError(err);
  }
}
