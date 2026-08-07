import { cn } from "@/lib/utils";

const COLOR_STYLES = {
  terracotta: {
    border: "border-t-terracotta-500",
    bg: "bg-terracotta-50",
    text: "text-terracotta-700",
    bar: "bg-terracotta-500",
    icon: "text-terracotta-600 bg-terracotta-50",
  },
  sand: {
    border: "border-t-sand-400",
    bg: "bg-sand-50",
    text: "text-sand-700",
    bar: "bg-sand-400",
    icon: "text-sand-600 bg-sand-100",
  },
  emerald: {
    border: "border-t-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    icon: "text-emerald-600 bg-emerald-50",
  },
  amber: {
    border: "border-t-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    bar: "bg-amber-500",
    icon: "text-amber-600 bg-amber-50",
  },
  red: {
    border: "border-t-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    bar: "bg-red-500",
    icon: "text-red-600 bg-red-50",
  },
  indigo: {
    border: "border-t-indigo-500",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    bar: "bg-indigo-500",
    icon: "text-indigo-600 bg-indigo-50",
  },
  slate: {
    border: "border-t-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700",
    bar: "bg-slate-400",
    icon: "text-slate-500 bg-slate-100",
  },
};

type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
  icon?: React.ReactNode;
  color?: "terracotta" | "sand" | "emerald" | "amber" | "red" | "indigo" | "slate";
  progress?: number;
  href?: string;
  className?: string;
};

export function MetricCard({
  label,
  value,
  description,
  trend,
  icon,
  color = "terracotta",
  progress,
  className,
}: MetricCardProps) {
  const styles = COLOR_STYLES[color];

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className={cn(
        `rounded-lg border border-border-default`,
        className
      )}
    >
      {children}
    </div>
  );

  return (
    <Wrapper>
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-2xl font-black font-mono tracking-tight text-fg-default")}>
              {value}
            </p>
            <p className="mt-1 text-xs font-semibold text-fg-muted">{label}</p>
            {description && (
              <p className="mt-0.5 text-[11px] text-fg-subtle">{description}</p>
            )}
          </div>
          {icon && (
            <span className={cn("rounded-lg p-2.5 border border-border-subtle", styles.icon)}>
              {icon}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-3 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", styles.bar)}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {/* Trend indicator */}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
            <span
              className={cn(
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-danger",
                trend.direction === "neutral" && "text-fg-muted"
              )}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "neutral" && "→"}
            </span>
            <span className="text-fg-muted">{trend.label}</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}