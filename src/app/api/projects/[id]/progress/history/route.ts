import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { recordProgressSnapshot } from "@/lib/services/progress.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;

    const snapshots = await db.progressSnapshot.findMany({
      where: { projectId },
      orderBy: { snapshotDate: "asc" },
    });

    return apiResponse(snapshots);
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
    const snapshot = await recordProgressSnapshot(projectId);
    return apiResponse(snapshot, 201);
  } catch (err) {
    return apiError(err);
  }
}
