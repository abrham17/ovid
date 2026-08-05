"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileBarChart2,
  FolderOpen,
  Gauge,
  HardHat,
  LayoutDashboard,
  Network,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceTab } from "@/lib/rbac";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { WORKSPACE_TAB_LABELS, WORKSPACE_TAB_GROUPS, ROLE_LABELS } from "@/lib/constants";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusBadge } from "@/components/status-badge";

const TAB_ICON_MAP: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  wbs: Network,
  daily: ClipboardList,
  schedule: CalendarDays,
  cost: DollarSign,
  risk: AlertTriangle,
  safety: ShieldCheck,
  quality: BadgeCheck,
  resources: Users,
  engineering: Ruler,
  documents: FolderOpen,
  procurement: ShoppingCart,
  reports: FileBarChart2,
};

const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  Management: Gauge,
  Commercial: DollarSign,
  Control: ShieldCheck,
  Technical: Ruler,
  Output: FolderOpen,
};

type Props = {
  project: ProjectHeaderData;
  activeTab: string;
};

export function ProjectSidebarNav({ project }: Props) {
  const pathname = usePathname();
  const allowedSet = new Set<string>(project.allowedTabs);
  const projectInitials = project.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="ws-sidebar" aria-label="Project workspace navigation">
      <div className="ws-sidebar-brand">
        <div className="ws-project-mark" aria-hidden>{projectInitials || "P"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold leading-tight text-slate-950">{project.name}</p>
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{project.code}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
            <StatusBadge status={project.status} className="text-[10px]" />
          </div>
        </div>
      </div>

      <div className="ws-sidebar-context">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <Building2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          <span className="truncate">{project.contractorOrg.name}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
          <span>Workspace navigation</span>
          <Activity className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
        </div>
      </div>

      <nav className="ws-sidebar-nav" aria-label="Project modules">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Project modules</p>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{project.allowedTabs.length}</span>
        </div>
        {WORKSPACE_TAB_GROUPS.map((group, index) => {
          const visibleTabs = group.tabs.filter((tab) => allowedSet.has(tab as WorkspaceTab));
          if (visibleTabs.length === 0) return null;
          const GroupIcon = GROUP_ICON_MAP[group.label] ?? Gauge;

          return (
            <section key={group.label} className="ws-sidebar-group" aria-labelledby={`workspace-group-${group.label}`}>
              <div className="ws-sidebar-group-heading">
                <span className="ws-sidebar-group-icon"><GroupIcon className="h-3.5 w-3.5" aria-hidden /></span>
                <span id={`workspace-group-${group.label}`}>{group.label}</span>
                <span className="ws-sidebar-group-line" aria-hidden />
                <span className="ws-sidebar-group-index">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="space-y-0.5">
                {visibleTabs.map((tab) => {
                  const Icon = TAB_ICON_MAP[tab] ?? LayoutDashboard;
                  const href = `/projects/${project.id}/${tab}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link key={tab} href={href} aria-current={isActive ? "page" : undefined} className={`ws-sidebar-link ${isActive ? "is-active" : ""}`}>
                      <span className="ws-sidebar-link-icon"><Icon className="h-4 w-4" aria-hidden /></span>
                      <span className="min-w-0 flex-1 truncate">{WORKSPACE_TAB_LABELS[tab] ?? tab}</span>
                      {isActive ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="ws-sidebar-access">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your access</p>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <PartyBadge partyType={project.userParty.partyType} className="px-2 py-0.5 text-[10px]" />
          <RoleBadge role={project.userRole} className="px-2 py-0.5 text-[10px]" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5 text-[10px] text-slate-500">
          <span className="truncate">{ROLE_LABELS[project.userRole]}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-700"><HardHat className="h-3 w-3" aria-hidden />{project.allowedTabs.length} modules</span>
        </div>
      </div>
    </aside>
  );
}
