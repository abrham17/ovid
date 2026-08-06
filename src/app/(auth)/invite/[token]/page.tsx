import Link from "next/link";
import { lookupInvitationByToken } from "@/lib/invitations/lookup";
import { AcceptInvitationForm } from "@/components/team/accept-invitation-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await lookupInvitationByToken(token);

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-slate-100"
        aria-hidden
      />
      <Card className="relative w-full max-w-sm shadow-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
            O
          </div>
          <div>
            <CardTitle className="text-xl">Accept invitation</CardTitle>
            <CardDescription className="mt-1">
              Set a password to join Ovid PMS.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!invitation ? (
            <p className="text-sm text-red-600" role="alert">
              This invitation link is invalid.
            </p>
          ) : !invitation.valid ? (
            <div className="space-y-3 text-sm">
              <p className="text-red-600" role="alert">
                {invitation.reason ?? "This invitation is no longer valid."}
              </p>
              <Link href="/login" className="inline-block font-medium text-emerald-700 hover:underline">
                Go to sign in
              </Link>
            </div>
          ) : (
            <AcceptInvitationForm
              token={token}
              email={invitation.email}
              fullName={invitation.fullName}
              roleLabel={invitation.roleLabel}
              organizationName={invitation.organizationName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
