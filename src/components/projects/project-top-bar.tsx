import Link from "next/link";
import { ChevronLeft, Building2, Landmark, ShieldCheck, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";
import { StatusBadge } from "@/components/status-badge";
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

/**
 * Glassmorphic sticky top bar inside the project workspace content pane.
 */
export function ProjectTopBar({ project }: { project: ProjectHeaderData }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-default/80 bg-surface-raised/85 backdrop-blur-md shadow-xs">
      {/* Row 1: Back + Project identity */}
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg-default transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            <span>Dashboard</span>
          </Link>

          <span className="text-border-strong font-light" aria-hidden>/</span>

          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-base font-extrabold text-fg-default tracking-tight">
              {project.name}
            </h1>
            <Badge variant="outline" size="sm" className="font-mono font-bold">
              {project.code}
            </Badge>
            <StatusBadge status={project.status} className="shrink-0 text-[11px] px-2 py-0.5" />
          </div>
        </div>

        <div className="shrink-0 text-right bg-primary-subtle/60 border border-primary/20 rounded-lg px-3 py-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Contract Value
          </p>
          <p className="text-sm font-extrabold text-primary font-mono">
            ETB {formatCurrency(project.contractValue)}
          </p>
        </div>
      </div>

      {/* Row 2: Party organization tags & dates */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle bg-surface-sunken/50 px-6 py-2 text-[11px] text-fg-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-50 border border-terracotta-200/80 px-2.5 py-0.5 text-terracotta-800">
            <Building2 className="h-3 w-3 text-terracotta-600" aria-hidden />
            <span className="font-semibold text-fg-muted">Contractor:</span>
            <strong className="font-bold text-fg-default">{project.contractorOrg.name}</strong>
            {project.contractorOrg.contractorGrade && (
              <span className="text-terracotta-700 font-medium">
                ({project.contractorOrg.contractorGrade.replace("GRADE_", "G")})
              </span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-indigo-800">
            <Landmark className="h-3 w-3 text-indigo-600" aria-hidden />
            <span className="font-semibold text-fg-muted">Client:</span>
            <strong className="font-bold text-fg-default">{project.clientOrg.name}</strong>
          </span>

          {project.consultantOrg && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 text-purple-800">
              <ShieldCheck className="h-3 w-3 text-purple-600" aria-hidden />
              <span className="font-semibold text-fg-muted">Consultant:</span>
              <strong className="font-bold text-fg-default">{project.consultantOrg.name}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-fg-muted font-medium">
          <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
          <span>
            {formatDate(project.plannedStartDate)} – {formatDate(project.plannedEndDate)}
          </span>
        </div>
      </div>
    </header>
  );
}