import { Building2, Calendar, FileText, Landmark, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate, ROLE_LABELS } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/status-badge";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Badge } from "@/components/ui/badge";

type ProjectHeaderData = {
  name: string;
  code: string;
  status: string;
  projectType: string;
  contractType: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  contractValue?: number;
  contractorOrg: { name: string; contractorGrade?: string };
  clientOrg: { name: string };
  consultantOrg?: { name: string };
  userParty: { partyType: PartyType; projectRole: string };
  userRole: UserRole;
  allowedTabs: string[];
};

export function ProjectHeader({ project }: { project: ProjectHeaderData }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-raised p-6 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-fg-default">{project.name}</h1>
            <Badge variant="outline" size="sm" className="font-mono font-semibold">
              {project.code}
            </Badge>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
              {project.projectType}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
              {project.contractType.replace("_", " ")}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
              {formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1 rounded-lg border border-primary-subtle bg-primary-subtle/50 p-3 text-right md:items-end">
          <span className="text-xs font-medium text-primary">Contract Value</span>
          <span className="text-xl font-bold text-fg-default">
            {project.contractValue != null
              ? formatCurrency(project.contractValue, "ETB")
              : "—"}
          </span>
        </div>
      </div>

      {/* Three-column org info */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-surface-sunken/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
            <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            Contractor
          </p>
          <p className="mt-1 text-sm font-medium text-fg-default">
            {project.contractorOrg.name}
            {project.contractorOrg.contractorGrade && (
              <span className="ml-1 text-xs text-fg-muted">
                (Grade {project.contractorOrg.contractorGrade})
              </span>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-sunken/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
            <Landmark className="h-3.5 w-3.5 text-info" aria-hidden />
            Client
          </p>
          <p className="mt-1 text-sm font-medium text-fg-default">
            {project.clientOrg.name}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-sunken/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
            Supervising Consultant
          </p>
          <p className="mt-1 text-sm font-medium text-fg-default">
            {project.consultantOrg?.name ?? "— Unassigned —"}
          </p>
        </div>
      </div>

      {/* Dual-layer access context banner */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-sunken px-3 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-fg-muted">Your Access:</span>
          <PartyBadge partyType={project.userParty.partyType} />
          <RoleBadge role={project.userRole} />
          <span className="text-fg-subtle">({project.userParty.projectRole})</span>
        </div>
        <span className="font-medium text-fg-muted">
          {project.allowedTabs.length} of 13 workspace tabs authorized for{" "}
          <span className="font-semibold text-fg-default">
            {ROLE_LABELS[project.userRole]}
          </span>
        </span>
      </div>
    </div>
  );
}