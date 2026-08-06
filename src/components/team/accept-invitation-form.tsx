"use client";

import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { acceptInvitation } from "@/lib/actions/invitations";

export function AcceptInvitationForm({
  token,
  email,
  fullName,
  roleLabel,
  organizationName,
}: {
  token: string;
  email: string;
  fullName: string;
  roleLabel: string;
  organizationName: string;
}) {
  const router = useRouter();

  return (
    <ActionForm
      action={acceptInvitation}
      successMessage="Account created."
      className="space-y-4"
      onSuccess={() => {
        router.push("/login?accepted=1");
        router.refresh();
      }}
    >
      <input type="hidden" name="token" value={token} />
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <p>
          <span className="font-medium">{fullName}</span> · {email}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {roleLabel} at {organizationName}
        </p>
      </div>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </ActionForm>
  );
}
