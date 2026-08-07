import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import {
  loginWithCredentials,
  createSessionToken,
  setSessionCookie,
  AuthError,
} from "@/lib/auth";
import { ok, fail, handleApiError, parseJson } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson(req);
    const input = loginSchema.parse(body);

    const user = await loginWithCredentials(input.email, input.password);
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        partyType: user.partyType,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return fail(err.message, err.status);
    }
    return handleApiError(err);
  }
}
