import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/invitations/token";
import { ROLE_LABELS } from "@/lib/constants";

export type InvitationPublicView = {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string;
  role: string;
  roleLabel: string;
  organizationName: string;
  invitedByName: string;
  expiresAt: Date;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  valid: boolean;
  reason?: string;
};

/** Look up an invitation by raw URL token for the accept page. */
export async function lookupInvitationByToken(rawToken: string): Promise<InvitationPublicView | null> {
  if (!rawToken || rawToken.length < 16) return null;

  const tokenHash = hashInviteToken(rawToken);
  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
    include: {
      organization: { select: { name: true } },
      invitedBy: { select: { fullName: true } },
    },
  });
  if (!invitation) return null;

  const expired = invitation.expiresAt.getTime() < Date.now();
  let status = invitation.status;
  let valid = status === "PENDING" && !expired;
  let reason: string | undefined;

  if (status === "PENDING" && expired) {
    status = "EXPIRED";
    valid = false;
    reason = "This invitation has expired. Ask your lead to send a new one.";
    await db.invitation
      .updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      })
      .catch(() => undefined);
  } else if (status === "ACCEPTED") {
    reason = "This invitation was already accepted. Sign in with your account.";
  } else if (status === "REVOKED") {
    reason = "This invitation was revoked. Ask your lead for a new invite.";
  } else if (status === "EXPIRED") {
    reason = "This invitation has expired. Ask your lead to send a new one.";
  }

  return {
    id: invitation.id,
    email: invitation.email,
    fullName: invitation.fullName,
    jobTitle: invitation.jobTitle,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role] ?? invitation.role,
    organizationName: invitation.organization.name,
    invitedByName: invitation.invitedBy.fullName,
    expiresAt: invitation.expiresAt,
    status,
    valid,
    reason,
  };
}
