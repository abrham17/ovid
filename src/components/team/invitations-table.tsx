"use client";

import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, formatDate } from "@/lib/constants";
import { resendInvitation, revokeInvitation } from "@/lib/actions/invitations";
import type { InvitationStatus, UserRole } from "@/generated/prisma/enums";

type InvitationRow = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: { fullName: string };
  organization: { name: string };
  project: { code: string; name: string } | null;
};

function statusTone(status: InvitationStatus): "default" | "success" | "warning" | "destructive" | "secondary" {
  if (status === "PENDING") return "warning";
  if (status === "ACCEPTED") return "success";
  if (status === "REVOKED") return "destructive";
  return "secondary";
}

export function InvitationsTable({ invitations }: { invitations: InvitationRow[] }) {
  if (invitations.length === 0) {
    return (
      <p className="text-sm text-slate-500">No invitations yet. Send one from the form.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-3 font-semibold">Invitee</th>
            <th className="py-2 pr-3 font-semibold">Role</th>
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="py-2 pr-3 font-semibold">Expires</th>
            <th className="py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invite) => {
            const canManage = invite.status === "PENDING" || invite.status === "EXPIRED";
            return (
              <tr key={invite.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-3">
                  <div className="font-medium text-slate-900">{invite.fullName}</div>
                  <div className="text-xs text-slate-500">{invite.email}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    by {invite.invitedBy.fullName} · {invite.organization.name}
                    {invite.project ? ` · ${invite.project.code}` : ""}
                  </div>
                </td>
                <td className="py-3 pr-3 text-slate-700">{ROLE_LABELS[invite.role]}</td>
                <td className="py-3 pr-3">
                  <Badge variant={statusTone(invite.status)}>{invite.status}</Badge>
                </td>
                <td className="py-3 pr-3 text-slate-600">{formatDate(invite.expiresAt)}</td>
                <td className="py-3">
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <ActionForm action={resendInvitation}>
                        <input type="hidden" name="invitationId" value={invite.id} />
                        <SubmitButton size="sm" variant="outline" pendingLabel="Resending…">
                          Resend
                        </SubmitButton>
                      </ActionForm>
                      {invite.status === "PENDING" ? (
                        <ActionForm action={revokeInvitation}>
                          <input type="hidden" name="invitationId" value={invite.id} />
                          <SubmitButton size="sm" variant="ghost" pendingLabel="Revoking…">
                            Revoke
                          </SubmitButton>
                        </ActionForm>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
