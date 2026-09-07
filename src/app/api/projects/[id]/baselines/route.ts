import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, created, handleApiError, parseJson } from "@/lib/api";
import {
  createInitialBaseline,
  submitBaseline,
  approveBaseline,
  rejectBaseline,
} from "@/lib/services/project.service";
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
    assertRoutePermission(user, "GET", "/api/projects/:id/baselines");

    const baselines = await db.projectBaseline.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    });
    return ok(baselines);
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
    assertRoutePermission(user, "POST", "/api/projects/:id/baselines");

    let body: any = {};
    try {
      body = await parseJson(req);
    } catch {
      body = {};
    }

    if (body.action === "submit") {
      const updated = await submitBaseline(user, projectId, body.baselineId);
      return ok(updated);
    }

    if (body.action === "approve") {
      const updated = await approveBaseline(user, projectId, body.baselineId, body.comment);
      return ok(updated);
    }

    if (body.action === "reject") {
      const updated = await rejectBaseline(user, projectId, body.baselineId, body.reason ?? "Rejected");
      return ok(updated);
    }

    const baseline = await createInitialBaseline(user, projectId);
    return created(baseline);
  } catch (err) {
    return handleApiError(err);
  }
}
