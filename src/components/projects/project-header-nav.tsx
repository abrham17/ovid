"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { usePathname } from "next/navigation";
import { titleCase } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { HardHat } from "lucide-react";
import { getVisibleTabs } from "@/lib/permissions-client";
import type { UserRole } from "@/generated/prisma/enums";

type HeaderTab = {
  id: string;
  label: string;
  href: string;
};

type Props = {
  projectId: string;
  projectName: string;
  projectCode: string;
  userName: string;
  userRole: string;
};

export function ProjectHeaderNav({
  projectId,
  projectName,
  projectCode,
  userName,
  userRole,
}: Props) {
  const pathname = usePathname() || "";

  const allTabs: HeaderTab[] = [
    { id: "overview", label: "Overview", href: `/projects/${projectId}/overview` },
    { id: "wbs", label: "WBS", href: `/projects/${projectId}/wbs` },
    { id: "schedule", label: "Schedule", href: `/projects/${projectId}/schedule` },
    { id: "daily", label: "Daily", href: `/projects/${projectId}/daily` },
    { id: "safety", label: "Safety", href: `/projects/${projectId}/safety` },
    { id: "cost", label: "Cost", href: `/projects/${projectId}/cost` },
    { id: "risk", label: "Risk", href: `/projects/${projectId}/risk` },
    { id: "team", label: "Team", href: `/projects/${projectId}/team` },
    { id: "quality", label: "Quality", href: `/projects/${projectId}/quality` },
    { id: "procurement", label: "Procurement", href: `/projects/${projectId}/procurement` },
    { id: "documents", label: "Documents", href: `/projects/${projectId}/documents` },
    { id: "resources", label: "Resources", href: `/projects/${projectId}/resources` },
  ];

  const visibleTabIds = getVisibleTabs(userRole as UserRole);
  const tabs = allTabs.filter((tab) => visibleTabIds.includes(tab.id));

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border-default bg-surface-default/95 backdrop-blur px-4 lg:px-6">
      {/* Brand logo & Title */}
      <div className="flex items-center gap-3">
        <span
          className="hidden truncate text-xs font-medium text-fg-muted md:inline-block max-w-[150px]"
          title={projectName}
        >
          {projectName} ({projectCode})
        </span>
      </div>

      {/* Navigation tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 align-center justify-content scrollbar-thin">
        {tabs.map((tab) => {
          const isActive = pathname.endsWith(tab.href) || pathname.includes(`${tab.href}/`);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 font-sans",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-fg-muted hover:bg-surface-sunken hover:text-fg-default"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

    </header>
  );
}