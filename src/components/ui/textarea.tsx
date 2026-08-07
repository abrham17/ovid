import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        `flex min-h-[80px] w-full rounded-md border bg-surface-raised px-3 py-2 text-sm text-fg-default placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors`,
        error ? "border-danger focus-visible:ring-danger" : "border-border-default focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };