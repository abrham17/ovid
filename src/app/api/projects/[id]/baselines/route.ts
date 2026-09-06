import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { createInitialBaseline } from "@/lib/services/project.service";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;
    const baselines = await db.projectBaseline.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    });
    return apiResponse(baselines);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;
    const baseline = await createInitialBaseline(user, projectId);
    return apiResponse(baseline, 201);
  } catch (err) {
    return apiError(err);
  }
}
