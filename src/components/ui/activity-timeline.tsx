"use client";

import { cn } from "@/lib/utils";
import {
  Circle,
  CheckCircle2,
  Clock,
  UserPlus,
  ClipboardList,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string | Date;
  user?: { name: string; role: string } | null;
  metadata?: Record<string, string>;
};

export type TimelineEventType =
  | "created"
  | "assigned"
  | "unassigned"
  | "daily_report"
  | "verified"
  | "countersigned"
  | "inspected"
  | "passed"
  | "failed"
  | "progress"
  | "schedule_change"
  | "comment"
  | "dispute"
  | "stoppage"
  | "completed";

// ── Icon Map ─────────────────────────────────────────────────────────

const EVENT_ICONS: Record<TimelineEventType, LucideIcon> = {
  created: Circle,
  assigned: UserPlus,
  unassigned: UserPlus,
  daily_report: ClipboardList,
  verified: FileCheck,
  countersigned: FileCheck,
  inspected: ShieldCheck,
  passed: CheckCircle2,
  failed: AlertTriangle,
  progress: Clock,
  schedule_change: CalendarRange,
  comment: MessageSquare,
  dispute: AlertTriangle,
  stoppage: AlertTriangle,
  completed: CheckCircle2,
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  created: "text-fg-muted",
  assigned: "text-blue-500",
  unassigned: "text-fg-muted",
  daily_report: "text-sand-600",
  verified: "text-emerald-500",
  countersigned: "text-emerald-500",
  inspected: "text-violet-500",
  passed: "text-emerald-500",
  failed: "text-red-500",
  progress: "text-amber-500",
  schedule_change: "text-amber-500",
  comment: "text-fg-muted",
  dispute: "text-red-500",
  stoppage: "text-orange-500",
  completed: "text-emerald-600",
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatTimestamp(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Single Event Row ─────────────────────────────────────────────────

function TimelineEventRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const Icon = EVENT_ICONS[event.type] ?? Circle;
  const colorClass = EVENT_COLORS[event.type] ?? "text-fg-muted";

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border-default" />
      )}

      {/* Icon circle */}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised ring-1 ring-border-default">
        <Icon className={cn("h-3.5 w-3.5", colorClass)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-fg-default">{event.title}</p>
          <span className="shrink-0 text-xs text-fg-muted">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
        {event.description && (
          <p className="mt-0.5 text-xs text-fg-muted">{event.description}</p>
        )}
        {event.user && (
          <p className="mt-0.5 text-xs text-fg-muted">
            — {event.user.name}
            {event.user.role ? ` (${event.user.role.replace("_", " ")})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export type ActivityTimelineProps = {
  events: TimelineEvent[];
  className?: string;
  emptyMessage?: string;
};

export function ActivityTimeline({
  events,
  className,
  emptyMessage = "No activity history yet.",
}: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-fg-muted", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("pt-2", className)}>
      {events.map((event, index) => (
        <TimelineEventRow
          key={event.id}
          event={event}
          isLast={index === events.length - 1}
        />
      ))}
    </div>
  );
}