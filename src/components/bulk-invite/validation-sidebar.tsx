// components/bulk-invite/validation-sidebar.tsx
"use client";

import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryStats } from "./types";
import type { BulkInviteController } from "./hooks/useBulkInvite";

interface ValidationSidebarProps {
  summary: SummaryStats;
  controller: BulkInviteController;
}

const CARDS: {
  key: keyof SummaryStats;
  label: string;
  icon: React.ElementType;
  tone: string;
  filter?: BulkInviteController["statusFilter"];
}[] = [
  {
    key: "imported",
    label: "Imported",
    icon: Users,
    tone: "text-foreground",
  },
  {
    key: "ready",
    label: "Ready",
    icon: CheckCircle2,
    tone: "text-emerald-600 dark:text-emerald-400",
    filter: "ready",
  },
  {
    key: "warnings",
    label: "Warnings",
    icon: AlertTriangle,
    tone: "text-amber-600 dark:text-amber-400",
    filter: "warning",
  },
  {
    key: "errors",
    label: "Errors",
    icon: XCircle,
    tone: "text-red-600 dark:text-red-400",
    filter: "error",
  },
  {
    key: "duplicates",
    label: "Duplicates",
    icon: Copy,
    tone: "text-orange-600 dark:text-orange-400",
    filter: "duplicate",
  },
  {
    key: "existing",
    label: "Already registered",
    icon: UserCheck,
    tone: "text-blue-600 dark:text-blue-400",
  },
];

export function ValidationSidebar({ summary, controller }: ValidationSidebarProps) {
  return (
    <aside className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Summary
      </h3>
      <div className="space-y-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const value = summary[card.key];
          const isActive =
            card.filter != null && controller.statusFilter === card.filter;
          return (
            <button
              key={card.key}
              type="button"
              disabled={!card.filter}
              onClick={() => {
                if (!card.filter) return;
                controller.setStatusFilter(
                  isActive ? "all" : card.filter
                );
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors",
                card.filter && "hover:bg-accent/50 cursor-pointer",
                !card.filter && "cursor-default",
                isActive && "border-primary bg-primary/5"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", card.tone)} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </div>
              <div className={cn("text-sm font-semibold tabular-nums", card.tone)}>
                {value}
              </div>
            </button>
          );
        })}
      </div>

      {summary.duplicates > 0 && (
        <button
          type="button"
          onClick={() => controller.mergeDuplicates()}
          className="w-full rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          Merge duplicate emails
        </button>
      )}
    </aside>
  );
}