import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  assignToActivity,
  unassignFromActivity,
  listActivityAssignments,
  listAssignableCandidates,
} from "@/lib/services/assignment.service";
import {
  assignToSection,
  unassignFromSection,
  listSectionAssignments,
} from "@/lib/services/section-assignment.service";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const sp = new URL(req.url).searchParams;
    const kind = sp.get("kind") ?? "activity";

    if (kind === "section") {
      return ok(await listSectionAssignments(user, projectId));
    }

    if (kind === "candidates") {
      const activityId = sp.get("activityId");
      const role = sp.get("role");
      if (!activityId) return fail("activityId query param is required", 400);
      if (role !== "FOREMAN" && role !== "SITE_ENGINEER") {
        return fail("role must be FOREMAN or SITE_ENGINEER", 400);
      }
      return ok(
        await listAssignableCandidates(user, projectId, activityId, role)
      );
    }

    const activityId = sp.get("activityId");
    if (!activityId) return fail("activityId query param is required", 400);
    return ok(await listActivityAssignments(user, activityId));
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("assign"),
    activityId: z.string().cuid(),
    userId: z.string().cuid(),
    role: z.enum(["SITE_ENGINEER", "FOREMAN"]),
  }),
  z.object({
    kind: z.literal("unassign"),
    assignmentId: z.string().cuid(),
  }),
  z.object({
    kind: z.literal("assign_section"),
    userId: z.string().cuid(),
    wbsNodeId: z.string().cuid(),
    role: z
      .enum([
        "SUBCONTRACTOR_OWNER",
        "SUPERINTENDENT_OWNER",
        "SITE_ENGINEER_OWNER",
      ])
      .default("SUBCONTRACTOR_OWNER"),

  }),
  z.object({
    kind: z.literal("unassign_section"),
    assignmentId: z.string().cuid(),
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const parsed = postSchema.parse(await parseJson(req));
    switch (parsed.kind) {
      case "assign":
        return created(
          await assignToActivity(user, parsed.activityId, parsed.userId, parsed.role)
        );
      case "unassign":
        return ok(await unassignFromActivity(user, parsed.assignmentId));
      case "assign_section":
        return created(
          await assignToSection(
            user,
            projectId,
            parsed.userId,
            parsed.wbsNodeId,
            parsed.role
          )
        );
      case "unassign_section":
        return ok(await unassignFromSection(user, parsed.assignmentId));
      default:
        return fail("Unknown kind", 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
