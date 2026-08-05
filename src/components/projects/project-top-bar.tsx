import Link from "next/link";
import { ChevronLeft, Building2, Landmark, ShieldCheck } from "lucide-react";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { formatCurrency, formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

/**
 * Compact sticky top bar rendered inside the project workspace content pane.
 * Replaces the old full-card ProjectHeader.
 */
export function ProjectTopBar({ project }: { project: ProjectHeaderData }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* ── Row 1: Back + Project identity ───────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Dashboard
        </Link>

        <span className="text-slate-300" aria-hidden>/</span>

        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">
            {project.name}
          </span>
          <Badge variant="outline" className="shrink-0 font-mono text-[11px]">
            {project.code}
          </Badge>
          <StatusBadge status={project.status} className="shrink-0 text-[11px]" />
        </div>

        <div className="ml-auto shrink-0 text-right">
          <p className="text-[10px] text-slate-400">Contract Value</p>
          <p className="text-sm font-bold text-emerald-800">
            ETB {formatCurrency(project.contractValue)}
          </p>
        </div>
      </div>

      {/* ── Row 2: Parties ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3 w-3 text-emerald-600" aria-hidden />
          <span className="font-medium text-slate-700">Contractor:</span>
          {project.contractorOrg.name}
          {project.contractorOrg.contractorGrade && (
            <span className="text-slate-400">
              ({project.contractorOrg.contractorGrade.replace("GRADE_", "G")})
            </span>
          )}
        </span>
        <span className="text-slate-200" aria-hidden>|</span>
        <span className="inline-flex items-center gap-1.5">
          <Landmark className="h-3 w-3 text-indigo-500" aria-hidden />
          <span className="font-medium text-slate-700">Client:</span>
          {project.clientOrg.name}
        </span>
        {project.consultantOrg && (
          <>
            <span className="text-slate-200" aria-hidden>|</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-purple-500" aria-hidden />
              <span className="font-medium text-slate-700">Consultant:</span>
              {project.consultantOrg.name}
            </span>
          </>
        )}
        <span className="ml-auto text-slate-400">
          {formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}
        </span>
      </div>
    </header>
  );
}
