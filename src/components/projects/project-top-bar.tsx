import Link from "next/link";
import { ChevronLeft, Building2, CalendarDays, Landmark, ShieldCheck } from "lucide-react";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { formatCurrency, formatDate } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

export function ProjectTopBar({ project }: { project: ProjectHeaderData }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-slate-500 transition hover:text-slate-900" aria-label="Back to dashboard"><ChevronLeft className="h-3.5 w-3.5" aria-hidden />Dashboard</Link>
          <span className="text-slate-300" aria-hidden>/</span>
          <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-bold text-slate-950">{project.name}</span><Badge variant="outline" className="shrink-0 font-mono text-[10px]">{project.code}</Badge><StatusBadge status={project.status} className="shrink-0 text-[10px]" /></div>
          <div className="ml-auto rounded-lg bg-emerald-50 px-3 py-1.5 text-right"><p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700">Contract value</p><p className="text-sm font-bold text-emerald-900">ETB {formatCurrency(project.contractValue)}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <PartyInfo icon={Building2} label="Contractor" value={project.contractorOrg.name} detail={project.contractorOrg.contractorGrade ? project.contractorOrg.contractorGrade.replace("GRADE_", "G") : undefined} />
          <PartyInfo icon={Landmark} label="Client" value={project.clientOrg.name} />
          {project.consultantOrg ? <PartyInfo icon={ShieldCheck} label="Consultant" value={project.consultantOrg.name} /> : null}
          <span className="inline-flex items-center gap-1.5 text-slate-400 md:ml-auto"><CalendarDays className="h-3 w-3" aria-hidden />{formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}</span>
        </div>
      </div>
    </header>
  );
}

function PartyInfo({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; detail?: string }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5"><Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden /><span className="font-semibold text-slate-700">{label}:</span><span className="truncate">{value}</span>{detail ? <span className="text-slate-400">({detail})</span> : null}</span>;
}
