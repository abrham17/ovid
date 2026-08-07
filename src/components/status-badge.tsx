import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  ACTION_PENDING: "bg-orange-50 text-orange-700 border-orange-200",
  CLOSED: "bg-surface-sunken text-fg-muted border-border-default",
  VERIFIED_CLOSED: "bg-success-subtle text-success border-success/20",
  REWORK_IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  PASS: "bg-success-subtle text-success border-success/20",
  FAIL: "bg-danger-subtle text-danger border-danger/20",
  CONDITIONAL_PASS: "bg-warning-subtle text-warning border-warning/20",
  ACTIVE: "bg-success-subtle text-success border-success/20",
  PLANNING: "bg-sky-50 text-sky-700 border-sky-200",
  SUSPENDED: "bg-warning-subtle text-warning border-warning/20",
  COMPLETE: "bg-surface-sunken text-fg-muted border-border-default",
  CLOSED_STATUS: "bg-surface-sunken text-fg-subtle",
  DRAFT: "bg-surface-sunken text-fg-muted border-border-default",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-success-subtle text-success border-success/20",
  REJECTED: "bg-danger-subtle text-danger border-danger/20",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border-sky-200",
  NOT_STARTED: "bg-surface-sunken text-fg-subtle border-border-default",
  ON_HOLD: "bg-warning-subtle text-warning border-warning/20",
  LOW: "bg-surface-sunken text-fg-muted",
  MEDIUM: "bg-warning-subtle text-warning",
  HIGH: "bg-danger-subtle text-danger",
  CRITICAL: "bg-danger/20 text-danger",
  MINOR: "bg-surface-sunken text-fg-muted",
  MAJOR: "bg-danger-subtle text-danger",
};

export function StatusBadge({
  status,
  className,
  dot,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";

  return (
    <Badge
      variant="outline"
      size="sm"
      dot={dot}
      className={cn("font-medium capitalize", style, className)}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}