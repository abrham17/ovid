import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-subtle text-primary",
        secondary: "bg-surface-sunken text-fg-muted",
        outline: "border border-border-default text-fg-default",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        destructive: "bg-danger-subtle text-danger",
        info: "bg-info-subtle text-info",
      },
      size: {
        xs: "px-1.5 py-0.5 text-[10px]",
        sm: "px-2 py-0.5 text-[11px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };