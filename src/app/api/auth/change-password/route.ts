import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError, ok, parseJson } from "@/lib/api";
export async function POST(req: NextRequest) { try { const session = await requireSession(); const { password } = z.object({ password: z.string().min(12).max(128) }).parse(await parseJson(req)); await db.user.update({ where: { id: session.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: false } }); const next = { ...session, mustChangePassword: false }; await setSessionCookie(await createSessionToken(next)); return ok({ changed: true }); } catch (e) { return handleApiError(e); } }
