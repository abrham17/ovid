import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  listSafety,
  createObservation,
  createIncident,
  updateIncidentStatus,
  updateIncident,
} from "@/lib/services/safety.service";
import {
  createObservationSchema,
  createIncidentSchema,
  updateIncidentSchema,
} from "@/lib/validations/safety";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const data = await listSafety(user, projectId);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}

const postBodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("observation"),
    data: createObservationSchema,
  }),
  z.object({
    kind: z.literal("incident"),
    data: createIncidentSchema,
  }),
  z.object({
    kind: z.literal("status"),
    incidentId: z.string().cuid(),
    status: z.enum(["OPEN", "ACTION_PENDING", "CLOSED"]),
    correctiveAction: z.string().max(2000).optional().nullable(),
  }),
  z.object({
    kind: z.literal("update_incident"),
    incidentId: z.string().cuid(),
    data: updateIncidentSchema,
  }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession();
    const { projectId } = await ctx.params;
    const body = await parseJson(req);
    const parsed = postBodySchema.parse(body);

    if (parsed.kind === "observation") {
      return created(await createObservation(user, projectId, parsed.data));
    }
    if (parsed.kind === "incident") {
      return created(await createIncident(user, projectId, parsed.data));
    }
    if (parsed.kind === "status") {
      return ok(
        await updateIncidentStatus(
          user,
          projectId,
          parsed.incidentId,
          parsed.status,
          parsed.correctiveAction
        )
      );
    }
    if (parsed.kind === "update_incident") {
      return ok(await updateIncident(user, projectId, parsed.incidentId, parsed.data));
    }
    return fail("Unknown kind", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
