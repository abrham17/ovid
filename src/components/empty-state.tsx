import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon: IconProp,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon | React.ReactNode;
}) {
  const renderedIcon =
    IconProp == null ? (
      <Inbox className="h-10 w-10" aria-hidden />
    ) : React.isValidElement(IconProp) ? (
      IconProp
    ) : (
      // LucideIcon (forwardRef object) — render as a component
      React.createElement(IconProp as React.ComponentType<{ className?: string }>, {
        className: "h-10 w-10",
      })
    );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center animate-fade-in",
        className
      )}
    >
      <div className="text-fg-subtle mb-4">{renderedIcon}</div>
      <p className="text-sm font-semibold text-fg-default">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-fg-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}