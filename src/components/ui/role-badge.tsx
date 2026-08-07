import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Partial<Record<UserRole, string>> = {
  SENIOR_PM: "bg-terracotta-50 text-terracotta-700 border-terracotta-200",
  DEPUTY_PM: "bg-terracotta-50 text-terracotta-700 border-terracotta-200",
  SITE_ENGINEER: "bg-sky-50 text-sky-700 border-sky-200",
  FOREMAN: "bg-orange-50 text-orange-700 border-orange-200",
  SUPERINTENDENT: "bg-orange-50 text-orange-700 border-orange-200",
  QC_INSPECTOR: "bg-purple-50 text-purple-700 border-purple-200",
  HSE_OFFICER: "bg-rose-50 text-rose-700 border-rose-200",
  QS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PROCUREMENT: "bg-amber-50 text-amber-700 border-amber-200",
  FINANCE: "bg-teal-50 text-teal-700 border-teal-200",
  HR: "bg-pink-50 text-pink-700 border-pink-200",
  EQUIPMENT_MANAGER: "bg-cyan-50 text-cyan-700 border-cyan-200",
  CONTRACTS_LEGAL: "bg-sand-100 text-sand-700 border-sand-300",
  CONSULTANT_ENGINEER: "bg-violet-50 text-violet-700 border-violet-200",
  CLIENT_REP: "bg-blue-50 text-blue-700 border-blue-200",
  ADMIN: "bg-terracotta-900 text-sand-50 border-terracotta-900",
  SUBCONTRACTOR_PM: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

export function RoleBadge({ role, className = "" }: { role: UserRole; className?: string }) {
  const style =
    ROLE_STYLES[role] ??
    "bg-surface-sunken text-fg-muted border-border-default";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style,
        className
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}