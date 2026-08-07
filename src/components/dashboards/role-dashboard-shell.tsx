"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  HardHat,
  ListChecks,
  ShieldAlert,
  TimerReset,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  type MetricKey,
  type DashboardDataPayload,
} from "@/lib/services/dashboard.service";
import { formatCurrency, titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { RoleBadge } from "@/components/ui/role-badge";
import { PartyBadge } from "@/components/ui/party-badge";
import { SignOutButton } from "@/components/sign-out-button";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export type DashboardProps = {
  userId: string;
  organizationId: string;
  partyType: PartyType;
  organizationName: string;
  projectId?: string;
};

type DashboardMetric = {
  key: MetricKey;
  label: string;
  href?: string;
  tone?: "default" | "good" | "warn" | "bad";
  icon?: React.ComponentType<{ className?: string }>;
};

type DashboardShortcut = {
  label: string;
  href: string;
  detail: string;
};

type DashboardConfig = {
  role: UserRole;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  queueTitle: string;
  queue: MetricKey[];
  shortcuts: DashboardShortcut[];
};

const QUEUE_LABELS: Record<MetricKey, string> = {
  activeProjects: "Active projects",
  projects: "Visible projects",
  avgProgress: "Average progress",
  openRisks: "Open risks",
  openIncidents: "Open safety incidents",
  pendingDaily: "Daily reports awaiting sign-off",
  pendingMeasurements: "Pending measurements",
  submittedMeasurements: "Submitted IPC measurements",
  certifiedPayments: "Certified payments",
  openDefects: "Open defects",
  openPunches: "Open punch items",
  materialDemands: "Material demands",
  purchaseOrders: "Purchase orders in flight",
  pendingVariations: "Pending variations",
  equipmentDownHours: "Equipment down hours",
  laborAssignments: "Labor assignments",
  documentsReview: "Documents under review",
  regulatoryReports: "Regulatory exports",
  recentStoppages: "Recent stoppages",
  designPending: "Design pending",
  teamSize: "Team size",
  users: "Active users",
  organizations: "Organizations",
  pendingITRs: "Pending ITRs",
  overallProgress: "Overall progress",
  overdueActivities: "Overdue activities",
  pendingReviews: "Pending reviews",
  activeSubcontractors: "Active subcontractors",
  pendingInspections: "Pending inspections",
};

const QUEUE_ICONS: Partial<Record<MetricKey, React.ComponentType<{ className?: string }>>> = {
  openRisks: AlertTriangle,
  openIncidents: ShieldAlert,
  pendingDaily: ClipboardCheck,
  submittedMeasurements: FileCheck2,
  openDefects: ListChecks,
  openPunches: ListChecks,
  equipmentDownHours: TimerReset,
  projects: FolderKanban,
};

const METRIC_TONE_STYLES = {
  good: {
    value: "text-2xl font-black text-success font-mono",
    bar: "bg-success",
    card: "border-success/30 bg-success-subtle/30 hover:border-success",
  },
  warn: {
    value: "text-2xl font-black text-warning font-mono",
    bar: "bg-warning",
    card: "border-warning/30 bg-warning-subtle/30 hover:border-warning",
  },
  bad: {
    value: "text-2xl font-black text-danger font-mono",
    bar: "bg-danger",
    card: "border-danger/30 bg-danger-subtle/30 hover:border-danger",
  },
  default: {
    value: "text-2xl font-black text-fg-default font-mono",
    bar: "bg-border-strong",
    card: "border-border-default hover:border-primary/30",
  },
} as const;

export function RoleDashboard(props: DashboardProps & DashboardConfig) {
  const [data, setData] = useState<DashboardDataPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-32 animate-pulse rounded-xl bg-surface-sunken" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-sunken" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const primaryProject = data.projects[0];

  return (
    <div className="space-y-6 p-6">
      {/* ── Welcome Hero Banner ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border-default bg-surface-raised p-6 shadow-xs flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary-subtle px-2 py-0.5 rounded">
              <Sparkles className="h-3 w-3 text-primary" />
              Live Workspace
            </span>
            <PartyBadge partyType={props.partyType} className="text-[10px]" />
            <RoleBadge role={props.role} className="text-[10px]" />
          </div>
          <h1 className="text-2xl font-extrabold text-fg-default tracking-tight">{props.title}</h1>
          <p className="mt-1 max-w-2xl text-xs text-fg-muted font-medium">{props.description}</p>
        </div>

        <div className="flex items-center gap-3">
          {primaryProject && (
            <Link
              href={`/projects/${primaryProject.id}/overview`}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:bg-primary-hover"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Open Active Project</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>

      {/* ── Metric Cards Grid ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {props.metrics.map((m) => (
          <MetricCard
            key={m.key}
            metric={m}
            value={data.metrics[m.key] ?? 0}
            href={
              primaryProject
                ? m.href?.replace(":projectId", primaryProject.id)
                : m.href
            }
          />
        ))}
      </div>

      {/* ── Project Pulse & Action Queue ─────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Project Pulse */}
        <Card>
          <CardHeader className="pb-3 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-fg-default">Project Pulse</CardTitle>
              <Badge variant="secondary" size="sm">
                {data.projects.length} Visible Projects
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data.projects.length === 0 ? (
              <EmptyState
                title="No visible projects"
                description="Projects assigned to this role and party will appear here."
              />
            ) : (
              <div className="space-y-3">
                {data.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/overview`}
                    className="group grid gap-3 rounded-lg border border-border-default bg-surface-sunken/50 p-4 transition hover:border-primary/30 hover:bg-primary-subtle/30 hover:shadow-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-fg-default group-hover:text-primary">
                          {project.name}
                        </p>
                        <Badge variant="outline" size="xs" className="font-mono font-bold">
                          {project.code}
                        </Badge>
                        <StatusBadge status={project.status} className="text-[10px]" />
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-2 rounded-full bg-surface-sunken overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, project.progress))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-fg-muted">
                        {project.progress}% schedule progress
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-right text-xs sm:min-w-56">
                      <MiniStat label="Contract Value" value={`ETB ${formatCurrency(project.contractValue)}`} />
                      <MiniStat label="Open Risks" value={project.openRisks} tone={project.openRisks > 0 ? "warn" : "default"} />
                      <MiniStat label="Incidents" value={project.openIncidents} tone={project.openIncidents > 0 ? "bad" : "default"} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Queue */}
        <Card>
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-base font-bold text-fg-default">{props.queueTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {props.queue.map((key) => (
              <QueueRow key={key} metricKey={key} value={data.metrics[key] ?? 0} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Role Shortcuts ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-bold text-fg-default">Role Quick Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {props.shortcuts.map((s) => (
              <ShortcutCard
                key={s.href}
                shortcut={{
                  ...s,
                  href: primaryProject
                    ? s.href.replace(":projectId", primaryProject.id)
                    : s.href,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function MetricCard({
  metric,
  value,
  href,
}: {
  metric: DashboardMetric;
  value: number;
  href?: string;
}) {
  const tone = metric.tone ?? "default";
  const styles = METRIC_TONE_STYLES[tone];
  const Icon = metric.icon;

  const inner = (
    <Card className={`h-full transition-all duration-200 hover:shadow-md ${styles.card}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={styles.value}>{formatMetricValue(metric.key, value)}</p>
            <p className="mt-1 text-xs font-semibold text-fg-muted">{metric.label}</p>
          </div>
          {Icon && (
            <span className="rounded-lg bg-surface-raised p-2 shadow-xs border border-border-subtle">
              <Icon className="h-4 w-4 text-fg-subtle" aria-hidden />
            </span>
          )}
        </div>
        <div className="mt-3 h-1 rounded-full bg-surface-sunken overflow-hidden">
          <div className={`h-full w-1/3 rounded-full ${styles.bar}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

function QueueRow({ metricKey, value }: { metricKey: MetricKey; value: number }) {
  const Icon = QUEUE_ICONS[metricKey] ?? HardHat;
  const isAlert = value > 0 && ["openRisks", "openIncidents", "openDefects", "openPunches"].includes(metricKey);

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
        isAlert
          ? "border-warning/40 bg-warning-subtle/60"
          : "border-border-subtle bg-surface-sunken/80 hover:bg-surface-sunken"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={`h-4 w-4 shrink-0 ${isAlert ? "text-warning" : "text-fg-subtle"}`}
          aria-hidden
        />
        <span className="truncate text-xs font-medium text-fg-muted">
          {QUEUE_LABELS[metricKey]}
        </span>
      </div>
      <span
        className={`text-xs font-mono font-bold ${
          isAlert ? "text-warning" : "text-fg-default"
        }`}
      >
        {formatMetricValue(metricKey, value)}
      </span>
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: DashboardShortcut }) {
  return (
    <Link
      href={shortcut.href}
      className="group flex items-start justify-between rounded-lg border border-border-default bg-surface-raised p-3.5 transition-all hover:border-primary/30 hover:bg-primary-subtle/30 hover:shadow-xs"
    >
      <div>
        <span className="block text-xs font-bold text-fg-default group-hover:text-primary">
          {shortcut.label}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium text-fg-muted">
          {shortcut.detail}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle group-hover:text-primary transition-colors mt-0.5" />
    </Link>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warn" | "bad";
}) {
  const valueClass =
    tone === "warn"
      ? "font-mono font-bold text-warning"
      : tone === "bad"
        ? "font-mono font-bold text-danger"
        : "font-mono font-bold text-fg-default";
  return (
    <div>
      <p className={valueClass}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-fg-muted">{label}</p>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatMetricValue(key: MetricKey, value: number) {
  if (key === "avgProgress") return `${value}%`;
  if (key === "equipmentDownHours") return `${value.toFixed(1)}h`;
  if (key === "certifiedPayments") {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString("en-US");
}

export function makeShortcut(module: string, label: string, detail: string): DashboardShortcut {
  return { href: `/projects/:projectId/${module}`, label, detail };
}

export function metric(
  key: MetricKey,
  label?: string,
  module?: string,
  tone?: DashboardMetric["tone"],
  icon?: DashboardMetric["icon"]
): DashboardMetric {
  return {
    key,
    label: label ?? titleCase(key),
    href: module
      ? module.startsWith("/")
        ? module
        : `/projects/:projectId/${module}`
      : undefined,
    tone,
    icon,
  };
}