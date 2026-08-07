import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listCompliance,
  createRegulatoryReport,
  createDecision,
  createLesson,
  generateProgressSnapshot,
} from "@/lib/services/compliance.service";
import {
  createRegulatoryReportSchema,
  createDecisionSchema,
  createLessonSchema,
} from "@/lib/validations/compliance";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    return ok(await listCompliance(user, projectId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("report"),
    data: createRegulatoryReportSchema.omit({ projectId: true }),
  }),
  z.object({ kind: z.literal("decision"), data: createDecisionSchema }),
  z.object({ kind: z.literal("lesson"), data: createLessonSchema }),
  z.object({ kind: z.literal("export_progress") }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));

    if (parsed.kind === "report") {
      return created(
        await createRegulatoryReport(user, { ...parsed.data, projectId })
      );
    }
    if (parsed.kind === "decision") {
      return created(await createDecision(user, projectId, parsed.data));
    }
    if (parsed.kind === "lesson") {
      return created(await createLesson(user, projectId, parsed.data));
    }
    if (parsed.kind === "export_progress") {
      return ok(await generateProgressSnapshot(user, projectId));
    }
    return fail("Unknown kind", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
