import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, startAdornment, endAdornment, error, success, ...props }, ref) => {
    const borderColor = error
      ? "border-danger focus-visible:ring-danger"
      : success
        ? "border-success focus-visible:ring-success"
        : "border-border-default focus-visible:ring-primary";

    return (
      <div className="relative flex items-center">
        {startAdornment && (
          <span className="pointer-events-none absolute left-3 text-fg-muted text-sm">
            {startAdornment}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            `flex h-10 w-full rounded-md border ${borderColor} bg-surface-raised px-3 py-2 text-sm text-fg-default placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors`,
            startAdornment && "pl-8",
            endAdornment && "pr-8",
            className
          )}
          {...props}
        />
        {endAdornment && (
          <span className="pointer-events-none absolute right-3 text-fg-muted text-sm">
            {endAdornment}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };