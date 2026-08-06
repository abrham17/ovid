import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/generated/prisma/enums";

export function invitationEmailHtml(opts: {
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: UserRole;
  inviteUrl: string;
  expiresAt: Date;
}): string {
  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role;
  const expires = opts.expiresAt.toUTCString();
  return `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
      <tr>
        <td style="padding: 28px 28px 8px;">
          <div style="display:inline-block;background:#047857;color:#fff;font-weight:700;font-size:12px;padding:6px 10px;border-radius:6px;">Ovid PMS</div>
          <h1 style="font-size: 20px; margin: 16px 0 8px;">You're invited to join ${escapeHtml(opts.organizationName)}</h1>
          <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
            Hi ${escapeHtml(opts.inviteeName)}, ${escapeHtml(opts.inviterName)} invited you to Ovid PMS as
            <strong>${escapeHtml(roleLabel)}</strong>.
          </p>
          <p style="margin: 0 0 20px;">
            <a href="${escapeHtml(opts.inviteUrl)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:600;">
              Accept invitation
            </a>
          </p>
          <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
            Or paste this link into your browser:<br/>
            <span style="word-break: break-all;">${escapeHtml(opts.inviteUrl)}</span>
          </p>
          <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px;">
            This link expires on ${escapeHtml(expires)}. If you did not expect this email, you can ignore it.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function invitationEmailText(opts: {
  inviteeName: string;
  inviterName: string;
  organizationName: string;
  role: UserRole;
  inviteUrl: string;
  expiresAt: Date;
}): string {
  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role;
  return [
    `Hi ${opts.inviteeName},`,
    "",
    `${opts.inviterName} invited you to join ${opts.organizationName} on Ovid PMS as ${roleLabel}.`,
    "",
    `Accept your invitation: ${opts.inviteUrl}`,
    "",
    `This link expires on ${opts.expiresAt.toUTCString()}.`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
