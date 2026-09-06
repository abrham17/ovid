import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { handleApiError, ok, parseJson } from "@/lib/api";
import { listExecutiveInterventions, respondToExecutiveIntervention } from "@/lib/services/general-manager.service";

export async function GET() {
  try { return ok(await listExecutiveInterventions(await requireSession())); }
  catch (error) { return handleApiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await parseJson<Record<string, unknown>>(req);
    return ok(await respondToExecutiveIntervention(user, z.string().cuid().parse(body.interventionId), z.object({ comment: z.string().min(3).max(4000), status: z.enum(["ACKNOWLEDGED", "ACTION_IN_PROGRESS", "READY_FOR_REVIEW"]) }).parse(body)));
  } catch (error) { return handleApiError(error); }
}
