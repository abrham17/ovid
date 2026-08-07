import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listDailyReports,
  createEarthworkEntry,
  createStructureEntry,
  createRebarEntry,
  submitDailyEntry,
  approveDailyEntry,
} from "@/lib/services/daily.service";
import {
  earthworkEntrySchema,
  structureEntrySchema,
  rebarEntrySchema,
} from "@/lib/validations/daily";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const type = searchParams.get("type") as "earthwork" | "structure" | "rebar" | undefined;
    const status = searchParams.get("status") ?? undefined;

    const data = await listDailyReports(user, projectId, { from, to, type, status });
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

const createBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("earthwork"),
    data: earthworkEntrySchema.omit({ projectId: true }),
  }),
  z.object({
    type: z.literal("structure"),
    data: structureEntrySchema.omit({ projectId: true }),
  }),
  z.object({
    type: z.literal("rebar"),
    data: rebarEntrySchema.omit({ projectId: true }),
  }),
]);

const actionBodySchema = z.object({
  action: z.enum(["submit", "approve"]),
  type: z.enum(["earthwork", "structure", "rebar"]),
  entryId: z.string().cuid(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);

    // Action: submit / approve existing entry
    if (body && typeof body === "object" && "action" in (body as object)) {
      const parsed = actionBodySchema.parse(body);
      if (parsed.action === "submit") {
        const entry = await submitDailyEntry(user, parsed.type, parsed.entryId);
        return ok(entry);
      }
      const entry = await approveDailyEntry(user, parsed.type, parsed.entryId);
      return ok(entry);
    }

    // Create new entry
    const parsed = createBodySchema.parse(body);

    if (parsed.type === "earthwork") {
      const entry = await createEarthworkEntry(user, { ...parsed.data, projectId });
      return created(entry);
    }
    if (parsed.type === "structure") {
      const entry = await createStructureEntry(user, { ...parsed.data, projectId });
      return created(entry);
    }
    if (parsed.type === "rebar") {
      const entry = await createRebarEntry(user, { ...parsed.data, projectId });
      return created(entry);
    }
    return fail("Unknown entry type", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
