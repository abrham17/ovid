"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<ActionResult | void>;

const initialState: ActionResult = { ok: true };

async function wrapAction(
  action: ServerAction,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const result = await action(formData);
    if (result && typeof result === "object" && "ok" in result) {
      return result;
    }
    return { ok: true, message: "Saved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return { ok: false, message };
  }
}

export function ActionForm({
  action,
  children,
  className,
  successMessage = "Saved.",
  onSuccess,
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: () => void;
}) {
  const bound = wrapAction.bind(null, action);
  const [state, formAction] = useActionState(bound, initialState);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (state.ok === false) {
      toast.error(state.message);
      return;
    }
    toast.success(state.message ?? successMessage);
    onSuccess?.();
  }, [state, successMessage, onSuccess]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  pendingLabel,
  variant,
  size,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className={cn(className)}
      variant={variant}
      size={size}
      disabled={disabled || pending}
    >
      {pending ? <Spinner /> : null}
      {pending ? pendingLabel ?? "Saving…" : children}
    </Button>
  );
}
