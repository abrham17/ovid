/** Build the public accept-invite URL for a raw token. */
export function buildInviteUrl(rawToken: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/invite/${rawToken}`;
}
