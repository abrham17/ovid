import { NextRequest } from "next/server";
import { acceptInvitationSchema } from "@/lib/validations/auth";
import {
  acceptInvitation,
  getInvitationByToken,
} from "@/lib/services/invitation.service";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { ok, handleApiError, parseJson, fail } from "@/lib/api";
import { db } from "@/lib/db";
import { acceptCompanyInvitation, getCompanyInvitation } from "@/lib/services/company.service";

/** Preview invitation (no auth) — GET ?token= */
export async function GET(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return fail("token required", 400);
    const inv = (await getCompanyInvitation(token)) ?? (await getInvitationByToken(token));
    if (!inv) return fail("Invitation not found or expired", 404);
    return ok(inv);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson(req);
    const input = acceptInvitationSchema.parse(body);

    const companyInvite = await getCompanyInvitation(input.token);
    const user = companyInvite
      ? await acceptCompanyInvitation(input.token, input.name, input.password)
      : await acceptInvitation(
      input.token,
      input.name,
      input.password
    );

    const org = await db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org.name,
      partyType: org.partyType,
      companyRoles: (await db.companyStaffAssignment.findMany({ where: { userId: user.id, organizationId: user.organizationId, active: true }, select: { role: true } })).map((r) => r.role),
    };

    const sessionToken = await createSessionToken(sessionUser);
    await setSessionCookie(sessionToken);

    return ok({ user: sessionUser });
  } catch (err) {
    return handleApiError(err);
  }
}
