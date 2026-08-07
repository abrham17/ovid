import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  createInvitations,
  listInvitations,
  revokeInvitation,
} from "@/lib/services/invitation.service";
import { bulkInviteSchema } from "@/lib/validations/invitation";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const projectId =
      new URL(req.url).searchParams.get("projectId") ?? undefined;
    const invitations = await listInvitations(user, projectId);
    return ok(invitations);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await parseJson(req);

    if (body && typeof body === "object" && (body as any).action === "revoke") {
      const schema = z.object({
        action: z.literal("revoke"),
        invitationId: z.string().cuid(),
      });
      const parsed = schema.parse(body);
      await revokeInvitation(user, parsed.invitationId);
      return ok({ revoked: true });
    }

    const input = bulkInviteSchema.parse(body);
    const results = await createInvitations(user, input);
    return created(results);
  } catch (err) {
    return handleApiError(err);
  }
}
