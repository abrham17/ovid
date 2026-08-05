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
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceTab } from "@/lib/rbac";
import type { ProjectHeaderData } from "@/lib/services/project.service";
import { WORKSPACE_TAB_LABELS, WORKSPACE_TAB_GROUPS, ROLE_LABELS } from "@/lib/constants";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusBadge } from "@/components/status-badge";

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
      {/* ── Project identity ─────────────────────────────────────────── */}
      <div className="border-b border-[--ws-sidebar-border] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-950">
              {project.name}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-slate-400">{project.code}</p>
          </div>
          <StatusBadge status={project.status} className="shrink-0 text-[10px]" />
        </div>
      </div>

      {/* ── Module groups ────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Project modules">
        {WORKSPACE_TAB_GROUPS.map((group) => {
          const visibleTabs = group.tabs.filter((t) => allowedSet.has(t as WorkspaceTab));
          if (visibleTabs.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[--ws-sidebar-section-fg]">
                {group.label}
              </p>
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
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] transition-colors",
                        isActive
                          ? "border-l-[3px] border-emerald-500 bg-emerald-50 pl-[9px] font-semibold text-emerald-900 shadow-sm"
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
      <div className="shrink-0 space-y-2 border-t border-[--ws-sidebar-border] bg-white px-3 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Your Access
        </p>
        <div className="flex flex-wrap gap-1.5">
          <PartyBadge partyType={project.userParty.partyType} className="text-[10px] px-2 py-0.5" />
          <RoleBadge role={project.userRole} className="text-[10px] px-2 py-0.5" />
        </div>
        <p className="text-[11px] text-slate-500">
          {ROLE_LABELS[project.userRole]} · {project.allowedTabs.length} modules
        </p>
      </div>
    </aside>
  );
}
