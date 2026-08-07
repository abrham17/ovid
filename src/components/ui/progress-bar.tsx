import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  color?: "terracotta" | "emerald" | "amber" | "red" | "indigo";
  showLabel?: boolean;
  className?: string;
};

const COLOR_MAP = {
  terracotta: "bg-terracotta-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
};

const SIZE_MAP = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  color = "terracotta",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 rounded-full bg-surface-sunken overflow-hidden",
          SIZE_MAP[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", COLOR_MAP[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono font-bold text-fg-muted tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}