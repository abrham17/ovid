import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";

export function RoleBadge({ role, className = "" }: { role: UserRole; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ${className}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
