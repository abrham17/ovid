import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  value: string;
  onValueChange?: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const Tabs = ({
  defaultValue = "",
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue ?? "";

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: onValueChange || setInternalValue }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({
  children,
  className,
  variant = "pills",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "pills" | "underline";
}) => {
  const base =
    variant === "underline"
      ? "flex items-center border-b border-border-default gap-0"
      : "inline-flex h-10 items-center justify-center rounded-md bg-surface-sunken p-1";

  return <div className={cn(base, className)}>{children}</div>;
};

const TabsTrigger = ({
  value,
  children,
  className,
  variant = "pills",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  variant?: "pills" | "underline";
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;

  const pills = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-surface-raised transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    isActive
      ? "bg-surface-raised text-fg-default shadow-xs"
      : "text-fg-muted hover:text-fg-default"
  );

  const underline = cn(
    "inline-flex items-center justify-center whitespace-nowrap px-3 py-2.5 text-sm font-medium ring-offset-surface-raised transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-b-2 -mb-px",
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-fg-muted hover:text-fg-default hover:border-border-strong"
  );

  return (
    <button
      type="button"
      onClick={() => context.onValueChange?.(value)}
      className={cn(variant === "underline" ? underline : pills, className)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const context = React.useContext(TabsContext);
  if (context.value !== value) return null;

  return (
    <div
      className={cn(
        "mt-2 ring-offset-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };