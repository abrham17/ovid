import { createHash, randomBytes } from "crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Generate a URL-safe raw token and its SHA-256 hash for storage. */
export function createInviteToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashInviteToken(rawToken) };
}

export function hashInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function inviteExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_MS);
}
