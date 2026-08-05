import type { PartyType } from "@/generated/prisma/enums";
import { PARTY_LABELS } from "@/lib/constants";

const PARTY_STYLES: Record<PartyType, string> = {
  CONTRACTOR: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CLIENT: "bg-indigo-50 text-indigo-800 border-indigo-200",
  CONSULTANT: "bg-purple-50 text-purple-800 border-purple-200",
  SUBCONTRACTOR: "bg-amber-50 text-amber-800 border-amber-200",
  SUPPLIER: "bg-teal-50 text-teal-800 border-teal-200",
  REGULATOR: "bg-rose-50 text-rose-800 border-rose-200",
};

export function PartyBadge({ partyType, className = "" }: { partyType: PartyType; className?: string }) {
  const style = PARTY_STYLES[partyType] ?? "bg-slate-50 text-slate-800 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      {PARTY_LABELS[partyType]}
    </span>
  );
}
