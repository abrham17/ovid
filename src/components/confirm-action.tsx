"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

export function ConfirmAction({
  action,
  children,
  confirmLabel = "Confirm",
  title = "Are you sure?",
  description,
  variant = "destructive",
  hiddenFields,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  confirmLabel?: string;
  title?: string;
  description?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  hiddenFields?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        {children}
      </Button>
    );
  }

  return (
    <div
      className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
    >
      <p id="confirm-action-title" className="font-medium text-slate-900">
        {title}
      </p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <ActionForm
        action={action}
        className="mt-3 flex flex-wrap items-center gap-2"
        successMessage="Done."
        onSuccess={() => setOpen(false)}
      >
        {hiddenFields
          ? Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))
          : null}
        <SubmitButton size="sm" variant={variant} pendingLabel="Working…">
          {confirmLabel}
        </SubmitButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </ActionForm>
    </div>
  );
}
