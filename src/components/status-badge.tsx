import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/constants";

const SUCCESS = new Set([
  "APPROVED",
  "PAID",
  "CLOSED",
  "COMPLETED",
  "CERTIFIED",
  "ACCEPTED",
  "ACTIVE",
  "DELIVERED",
  "AWARDED",
]);
const WARNING = new Set([
  "PENDING",
  "SUBMITTED",
  "IN_REVIEW",
  "OPEN",
  "MITIGATING",
  "QUERIED",
  "DRAFT",
  "ISSUED",
  "IN_PROGRESS",
]);
const DANGER = new Set([
  "REJECTED",
  "BLOCKED",
  "OVERDUE",
  "FAILED",
  "CANCELLED",
  "CRITICAL",
]);

function variantFor(status: string): React.ComponentProps<typeof Badge>["variant"] {
  const s = status.toUpperCase();
  if (SUCCESS.has(s)) return "success";
  if (DANGER.has(s)) return "destructive";
  if (WARNING.has(s)) return "warning";
  return "secondary";
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge variant={variantFor(status)} className={className}>
      {label ?? titleCase(status)}
    </Badge>
  );
}
