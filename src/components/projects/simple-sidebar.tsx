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
  FolderOpen,
  ShoppingCart,
  Settings,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

const NAV = [
  { id: "overview", label: "Overview", href: "", icon: LayoutDashboard },
  { id: "wbs", label: "WBS", href: "wbs", icon: Network },
  { id: "schedule", label: "Schedule", href: "schedule", icon: CalendarDays },
  { id: "daily", label: "Daily Reports", href: "daily", icon: ClipboardList },
  { id: "quality", label: "Quality", href: "quality", icon: BadgeCheck },
  { id: "safety", label: "HSE / Safety", href: "safety", icon: ShieldCheck },
  { id: "cost", label: "Cost & BOQ", href: "cost", icon: DollarSign },
  { id: "procurement", label: "Procurement", href: "procurement", icon: ShoppingCart },
  { id: "resources", label: "Labor & Equipment", href: "resources", icon: Users },
  { id: "documents", label: "Documents", href: "documents", icon: FolderOpen },
  { id: "risk", label: "Risk", href: "risk", icon: AlertTriangle },
  { id: "team", label: "Team", href: "team", icon: UserPlus },
  { id: "settings", label: "Settings", href: "settings", icon: Settings },
];

type Props = {
  projectId: string;
  projectName: string;
  projectCode?: string;
  status?: string;
};

export function SimpleProjectSidebar({ projectId, projectName, projectCode, status }: Props) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-default px-4 py-4">
        {projectCode && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {projectCode}
          </p>
        )}
        <h2 className="mt-0.5 truncate text-sm font-bold text-fg-default">{projectName}</h2>
        {status && (
          <div className="mt-2">
            <StatusBadge status={status} />
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const href = item.href ? `${base}/${item.href}` : base;
          const isActive =
            item.href === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary-subtle font-semibold text-primary"
                  : "text-fg-muted hover:bg-surface-sunken hover:text-fg-default"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-fg-subtle")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}