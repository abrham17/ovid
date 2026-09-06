import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { addProjectObjective } from "@/lib/services/project.service";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;
    const objectives = await db.projectObjective.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return apiResponse(objectives);
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
    const body = await req.json();
    const objective = await addProjectObjective(user, projectId, body);
    return apiResponse(objective, 201);
  } catch (err) {
    return apiError(err);
  }
}
