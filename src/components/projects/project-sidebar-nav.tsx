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
  FolderKanban,
  Building2,
  ShieldAlert,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceTab } from "@/lib/constants";
import { WORKSPACE_TAB_LABELS, WORKSPACE_TAB_GROUPS, ROLE_LABELS } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { StatusBadge } from "@/components/status-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

type ProjectHeaderData = {
  id: string;
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

const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  Management: FolderKanban,
  Commercial: DollarSign,
  Control: ShieldAlert,
  Technical: Layers,
  Output: FileBarChart2,
};

type Props = {
  project: ProjectHeaderData;
  activeTab: string;
};

export function ProjectSidebarNav({ project }: Props) {
  const pathname = usePathname();
  const allowedSet = new Set<string>(project.allowedTabs);

  return (
    <aside className="flex h-full flex-col border-r border-border-default bg-surface-raised" aria-label="Project workspace navigation">
      {/* ── Project identity header ──────────────────────────────────── */}
      <div className="border-b border-border-default bg-surface-raised px-4 py-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
              <Building2 className="h-3 w-3 shrink-0" />
              <span>{project.code}</span>
            </div>
            <h2 className="mt-1 truncate text-sm font-extrabold text-fg-default leading-tight">
              {project.name}
            </h2>
          </div>
          <StatusBadge status={project.status} className="shrink-0 text-[10px] px-2 py-0.5" />
        </div>
      </div>

      {/* ── Module groups navigation ────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Project modules">
        {WORKSPACE_TAB_GROUPS.map((group) => {
          const visibleTabs = group.tabs.filter((t) => allowedSet.has(t as WorkspaceTab));
          if (visibleTabs.length === 0) return null;

          const GroupIcon = GROUP_ICON_MAP[group.label] ?? FolderKanban;

          return (
            <div key={group.label} className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
                <GroupIcon className="h-3 w-3 text-fg-subtle" />
                <span>{group.label}</span>
              </div>
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
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2.5 py-2 text-xs transition-all",
                        isActive
                          ? "border-l-4 border-primary bg-primary-subtle pl-2 font-bold text-primary"
                          : "text-fg-muted hover:bg-surface-sunken hover:text-fg-default font-medium"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-fg-subtle group-hover:text-fg-muted"
                          )}
                          aria-hidden
                        />
                        <span className="truncate">
                          {WORKSPACE_TAB_LABELS[tab] ?? tab}
                        </span>
                      </div>

                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse-dot" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Access context footer ─────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border-default bg-surface-raised p-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
            Access Scope
          </span>
          <span className="text-[10px] font-semibold text-primary bg-primary-subtle px-1.5 py-0.5 rounded">
            {project.allowedTabs.length} modules
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PartyBadge partyType={project.userParty.partyType} className="text-[10px] px-2 py-0.5 font-semibold" />
          <RoleBadge role={project.userRole} className="text-[10px] px-2 py-0.5 font-semibold" />
        </div>
        <p className="text-[11px] text-fg-muted font-medium truncate">
          Role: <strong className="text-fg-default">{ROLE_LABELS[project.userRole]}</strong>
        </p>
        <SignOutButton />
      </div>
    </aside>
  );
}