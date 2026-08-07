import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { listProjects, createProject } from "@/lib/services/project.service";
import { createProjectSchema } from "@/lib/validations/project";
import { ok, created, handleApiError, parseJson } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const projects = await listProjects(user, { status, search });
    return ok(projects);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await parseJson(req);
    const input = createProjectSchema.parse(body);

    const project = await createProject(user, input);
    return created(project);
  } catch (err) {
    return handleApiError(err);
  }
}
