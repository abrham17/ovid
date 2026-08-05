"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  ClipboardList,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  BadgeCheck,
  Users,
  Ruler,
  FolderOpen,
  ShoppingCart,
  FileBarChart2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceTab } from "@/lib/rbac";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { WORKSPACE_TAB_LABELS, WORKSPACE_TAB_GROUPS, ROLE_LABELS } from "@/lib/constants";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusBadge } from "@/components/status-badge";
import { SignOutButton } from "@/components/sign-out-button";

/* ─── Icon registry ─────────────────────────────────────────────────────── */
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

type Props = {
  project: ProjectHeaderData;
  /** Ignored — activeTab derived from URL via usePathname */
  activeTab: string;
};

export function ProjectSidebarNav({ project }: Props) {
  const pathname = usePathname();
  const allowedSet = new Set<string>(project.allowedTabs);

  return (
    <aside
      className="ws-sidebar"
      aria-label="Project workspace navigation"
    >
      <div className="workspace-brand">
        <Link href="/dashboard" className="workspace-brand-link" aria-label="Back to dashboard">
          <span className="workspace-brand-mark"><BarChart3 className="h-4 w-4" aria-hidden /></span>
          <span>Ovid workspace</span>
        </Link>
      </div>

      {/* ── Project identity ─────────────────────────────────────────── */}
      <div className="workspace-project-identity">
        <p className="eyebrow-label">Current project</p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-900">
              {project.name}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">{project.code}</p>
          </div>
          <StatusBadge status={project.status} className="shrink-0 text-[10px]" />
        </div>
      </div>

      {/* ── Module groups ────────────────────────────────────────────── */}
      <nav className="workspace-module-nav flex-1 space-y-4 overflow-y-auto px-2 py-4" aria-label="Project modules">
        {WORKSPACE_TAB_GROUPS.map((group) => {
          const visibleTabs = group.tabs.filter((t) => allowedSet.has(t as WorkspaceTab));
          if (visibleTabs.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="workspace-section-label mb-1 px-2">{group.label}</p>
              <div className="space-y-0.5">
                {visibleTabs.map((tab) => {
                  const Icon = TAB_ICON_MAP[tab] ?? LayoutDashboard;
                  const href = `/projects/${project.id}/${tab}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={tab}
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "workspace-nav-link flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                        isActive
                          ? "workspace-nav-link-active border-l-[3px] border-emerald-500 bg-emerald-50 pl-[9px] font-semibold text-emerald-900"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400"}`}
                        aria-hidden
                      />
                      <span className="truncate">
                        {WORKSPACE_TAB_LABELS[tab] ?? tab}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Access context footer ─────────────────────────────────────── */}
<<<<<<< HEAD
      <div className="workspace-access-footer shrink-0 border-t border-[--ws-sidebar-border] px-3 py-3">
        <p className="workspace-section-label">
=======
      <div className="shrink-0 border-t border-[--ws-sidebar-border] px-3 py-3 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
>>>>>>> 1d602ff (feat:update on the ui)
          Your Access
        </p>
        <div className="flex flex-wrap gap-1.5">
          <PartyBadge partyType={project.userParty.partyType} className="text-[10px] px-2 py-0.5" />
          <RoleBadge role={project.userRole} className="text-[10px] px-2 py-0.5" />
        </div>
        <p className="text-[11px] text-slate-500">
          {ROLE_LABELS[project.userRole]} · {project.allowedTabs.length} modules
        </p>

        <Link
          href="/dashboard"
<<<<<<< HEAD
          className="workspace-footer-link mt-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          All dashboards
=======
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          Dashboard
>>>>>>> 1d602ff (feat:update on the ui)
        </Link>

        <SignOutButton className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600" />
      </div>
    </aside>
  );
}
