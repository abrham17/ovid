import { invitationEmailHtml, invitationEmailText } from "@/lib/email/templates/invitation";
import type { UserRole } from "@/generated/prisma/enums";

export type InvitationEmailPayload = {
  to: string;
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: UserRole;
  inviteUrl: string;
  expiresAt: Date;
};

/**
 * Sends an invitation email via the Resend HTTP API.
 * When RESEND_API_KEY is unset, logs the invite URL (local/dev fallback).
 */
export async function sendInvitationEmail(payload: InvitationEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(
      `[dev] Invitation for ${payload.to}: ${payload.inviteUrl} (expires ${payload.expiresAt.toISOString()})`
    );
    return;
  }

  const from = process.env.EMAIL_FROM?.trim() || "Ovid PMS <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: `You're invited to ${payload.organizationName} on Ovid PMS`,
      html: invitationEmailHtml(payload),
      text: invitationEmailText(payload),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Failed to send invitation email (${response.status}).`);
  }
}
