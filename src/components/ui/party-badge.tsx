import type { PartyType } from "@/generated/prisma/enums";
import { PARTY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PARTY_STYLES: Record<PartyType, string> = {
  CONTRACTOR: "bg-terracotta-50 text-terracotta-700 border-terracotta-200",
  CLIENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CONSULTANT: "bg-purple-50 text-purple-700 border-purple-200",
  SUBCONTRACTOR: "bg-amber-50 text-amber-700 border-amber-200",
  SUPPLIER: "bg-teal-50 text-teal-700 border-teal-200",
  REGULATOR: "bg-rose-50 text-rose-700 border-rose-200",
};

export function PartyBadge({ partyType, className = "" }: { partyType: PartyType; className?: string }) {
  const style = PARTY_STYLES[partyType] ?? "bg-surface-sunken text-fg-muted border-border-default";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style,
        className
      )}
    >
      {PARTY_LABELS[partyType]}
    </span>
  );
}