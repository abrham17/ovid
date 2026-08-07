import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { getProject, updateProject } from "@/lib/services/project.service";
import { updateProjectSchema } from "@/lib/validations/project";
import { ok, handleApiError, parseJson } from "@/lib/api";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const project = await getProject(user, projectId);
    return ok(project);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);
    const input = updateProjectSchema.parse(body);
    const project = await updateProject(user, projectId, input);
    return ok(project);
  } catch (err) {
    return handleApiError(err);
  }
}
