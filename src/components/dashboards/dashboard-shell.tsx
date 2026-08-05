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
} from "lucide-react";
import {
  getDashboardData,
  type MetricKey,
  type DashboardDataPayload,
} from "@/lib/services/dashboard.service";
import { formatCurrency, titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
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
  projects: "Visible projects",
  avgProgress: "Average progress",
  openRisks: "Open risks",
  openIncidents: "Open safety incidents",
  pendingDaily: "Daily reports awaiting sign-off",
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
  users: "Active users",
  organizations: "Organizations",
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

/* ─── Tone config ────────────────────────────────────────────────────────── */
const METRIC_TONE_STYLES = {
  good: {
    value: "text-2xl font-bold text-emerald-700",
    bar: "bg-emerald-500",
    card: "border-emerald-100 bg-emerald-50/30",
  },
  warn: {
    value: "text-2xl font-bold text-amber-600",
    bar: "bg-amber-400",
    card: "border-amber-100 bg-amber-50/30",
  },
  bad: {
    value: "text-2xl font-bold text-red-600",
    bar: "bg-red-500",
    card: "border-red-100 bg-red-50/30",
  },
  default: {
    value: "text-2xl font-bold text-slate-900",
    bar: "bg-slate-400",
    card: "",
  },
} as const;

/* ─── Main dashboard component ──────────────────────────────────────────── */
export async function RoleDashboard(props: DashboardProps & DashboardConfig) {
  const data: DashboardDataPayload = await getDashboardData({
    userId: props.userId,
    organizationId: props.organizationId,
    role: props.role,
    partyType: props.partyType,
  });
  const primaryProject = data.projects[0];

  return (
    <div className="space-y-6 p-6">
      {/* ── Welcome hero ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{props.title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{props.description}</p>
        </div>
        {primaryProject ? (
          <Link
            href={`/projects/${primaryProject.id}/overview`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            <TrendingUp className="h-4 w-4" aria-hidden />
            Open active project
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {/* ── Metric cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {props.metrics.map((m) => (
          <MetricCard
            key={m.key}
            metric={m}
            value={data.metrics[m.key]}
            href={
              primaryProject
                ? m.href?.replace(":projectId", primaryProject.id)
                : m.href
            }
          />
        ))}
      </div>

      {/* ── Project pulse + action queue ──────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Project pulse */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px]">Project pulse</CardTitle>
              <span className="text-xs text-slate-400">{data.projects.length} projects</span>
            </div>
          </CardHeader>
          <CardContent>
            {data.projects.length === 0 ? (
              <EmptyState
                title="No visible projects"
                description="Projects assigned to this role and party will appear here."
              />
            ) : (
              <div className="space-y-2.5">
                {data.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/overview`}
                    className="group grid gap-3 rounded-lg border border-slate-100 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/40 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-emerald-900">
                          {project.name}
                        </p>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {project.code}
                        </Badge>
                        <StatusBadge status={project.status} className="text-[10px]" />
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2.5 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500 transition-[width]"
                          style={{
                            width: `${Math.min(100, Math.max(0, project.progress))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {project.progress}% schedule progress
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-right text-[11px] sm:min-w-56">
                      <MiniStat label="Value" value={`ETB ${formatCurrency(project.contractValue)}`} />
                      <MiniStat label="Risks" value={project.openRisks} tone={project.openRisks > 0 ? "warn" : "default"} />
                      <MiniStat label="Incidents" value={project.openIncidents} tone={project.openIncidents > 0 ? "bad" : "default"} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">{props.queueTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.queue.map((key) => (
              <QueueRow key={key} metricKey={key} value={data.metrics[key]} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Role shortcuts ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]">Role shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
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
    <Card className={`h-full transition hover:shadow-sm ${styles.card}`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={styles.value}>{formatMetricValue(metric.key, value)}</p>
            <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
          </div>
          {Icon && (
            <span className="rounded-md bg-white/60 p-1.5 shadow-sm">
              <Icon className="h-4 w-4 text-slate-400" aria-hidden />
            </span>
          )}
        </div>
        {/* Thin accent bar at bottom */}
        <div className="mt-3 h-0.5 rounded-full bg-slate-100">
          <div className={`h-0.5 w-1/3 rounded-full ${styles.bar}`} />
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
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${isAlert ? "border-amber-100 bg-amber-50/50" : "border-slate-100 bg-slate-50"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${isAlert ? "text-amber-500" : "text-slate-400"}`} aria-hidden />
        <span className="truncate text-[13px] text-slate-700">{QUEUE_LABELS[metricKey]}</span>
      </div>
      <span className={`text-[13px] font-bold ${isAlert ? "text-amber-700" : "text-slate-900"}`}>
        {formatMetricValue(metricKey, value)}
      </span>
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: DashboardShortcut }) {
  return (
    <Link
      href={shortcut.href}
      className="group rounded-lg border border-slate-200 p-3.5 text-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
    >
      <span className="block font-semibold text-slate-900 group-hover:text-emerald-900">
        {shortcut.label}
      </span>
      <span className="mt-1 block text-xs text-slate-500">{shortcut.detail}</span>
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
      ? "font-semibold text-amber-700"
      : tone === "bad"
        ? "font-semibold text-red-600"
        : "font-semibold text-slate-900";
  return (
    <div>
      <p className={valueClass}>{value}</p>
      <p className="mt-0.5 text-slate-400">{label}</p>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatMetricValue(key: MetricKey, value: number) {
  if (key === "avgProgress") return `${value}%`;
  if (key === "equipmentDownHours") return `${value.toFixed(1)}h`;
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
