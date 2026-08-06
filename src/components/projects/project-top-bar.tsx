import Link from "next/link";
import { ChevronLeft, Building2, Landmark, ShieldCheck, Calendar } from "lucide-react";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { formatCurrency, formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

/**
 * Modern glassmorphic sticky top bar inside the project workspace content pane.
 */
export function ProjectTopBar({ project }: { project: ProjectHeaderData }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-2xs">
      {/* ── Row 1: Back + Project identity ───────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span>Dashboard</span>
          </Link>

          <span className="text-slate-300 font-light" aria-hidden>/</span>

          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-base font-extrabold text-slate-900 tracking-tight">
              {project.name}
            </h1>
            <Badge variant="outline" className="shrink-0 font-mono text-[11px] font-bold bg-slate-50">
              {project.code}
            </Badge>
            <StatusBadge status={project.status} className="shrink-0 text-[11px] px-2 py-0.5" />
          </div>
        </div>

        <div className="shrink-0 text-right bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
            Contract Value
          </p>
          <p className="text-sm font-extrabold text-emerald-900 font-mono">
            ETB {formatCurrency(project.contractValue)}
          </p>
        </div>
      </div>

      {/* ── Row 2: Party organization tags & dates ───────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-6 py-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-emerald-800">
            <Building2 className="h-3 w-3 text-emerald-600" aria-hidden />
            <span className="font-semibold text-slate-700">Contractor:</span>
            <strong className="font-bold text-slate-900">{project.contractorOrg.name}</strong>
            {project.contractorOrg.contractorGrade && (
              <span className="text-emerald-700 font-medium">
                ({project.contractorOrg.contractorGrade.replace("GRADE_", "G")})
              </span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-indigo-800">
            <Landmark className="h-3 w-3 text-indigo-600" aria-hidden />
            <span className="font-semibold text-slate-700">Client:</span>
            <strong className="font-bold text-slate-900">{project.clientOrg.name}</strong>
          </span>

          {project.consultantOrg && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-purple-800">
              <ShieldCheck className="h-3 w-3 text-purple-600" aria-hidden />
              <span className="font-semibold text-slate-700">Consultant:</span>
              <strong className="font-bold text-slate-900">{project.consultantOrg.name}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>
            {formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}
          </span>
        </div>
      </div>
    </header>
  );
}
