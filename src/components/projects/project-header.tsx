import { Building2, Calendar, FileText, Landmark, ShieldCheck } from "lucide-react";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Badge } from "@/components/ui/badge";

export function ProjectHeader({ project }: { project: ProjectHeaderData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <Badge variant="outline" className="text-xs font-mono font-semibold">
              {project.code}
            </Badge>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {project.projectType}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {project.contractType.replace("_", " ")}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-right md:items-end">
          <span className="text-xs font-medium text-emerald-800">Contract Value</span>
          <span className="text-xl font-bold text-emerald-900">
            ETB {formatCurrency(project.contractValue)}
          </span>
        </div>
      </div>

      <hr className="my-4 border-slate-100" />

      {/* Primary Parties */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            Contractor
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{project.contractorOrg.name}</p>
          {project.contractorOrg.contractorGrade ? (
            <p className="text-xs text-slate-500">
              {project.contractorOrg.contractorGrade.replace("GRADE_", "Grade ")}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Landmark className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
            Client / Employer
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{project.clientOrg.name}</p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" aria-hidden />
            Supervising Consultant
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {project.consultantOrg?.name ?? "— Unassigned —"}
          </p>
        </div>
      </div>

      {/* Dual-layer access context banner */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600">Your Access:</span>
          <PartyBadge partyType={project.userParty.partyType} />
          <RoleBadge role={project.userRole} />
          <span className="text-slate-500">({project.userParty.projectRole})</span>
        </div>
        <span className="font-medium text-slate-600">
          {project.allowedTabs.length} of 13 workspace tabs authorized for{" "}
          <span className="font-semibold text-slate-900">
            {ROLE_LABELS[project.userRole]}
          </span>
        </span>
      </div>
    </div>
  );
}
