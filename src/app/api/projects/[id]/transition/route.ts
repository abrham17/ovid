import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { transitionProjectStatus } from "@/lib/services/project.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;
    const body = await req.json();
    const updated = await transitionProjectStatus(
      user,
      projectId,
      body.targetStatus,
      body.reason ?? "Phase gate transition"
    );
    return apiResponse(updated);
  } catch (err) {
    return apiError(err);
  }
}
