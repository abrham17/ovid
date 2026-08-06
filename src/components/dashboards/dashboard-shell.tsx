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
  getDashboardData,
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

const METRIC_TONE_STYLES = {
  good: {
    value: "text-2xl font-black text-emerald-700 font-mono",
    bar: "bg-emerald-500",
    card: "border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300",
  },
  warn: {
    value: "text-2xl font-black text-amber-600 font-mono",
    bar: "bg-amber-500",
    card: "border-amber-200/80 bg-amber-50/20 hover:border-amber-300",
  },
  bad: {
    value: "text-2xl font-black text-red-600 font-mono",
    bar: "bg-red-500",
    card: "border-red-200/80 bg-red-50/20 hover:border-red-300",
  },
  default: {
    value: "text-2xl font-black text-slate-900 font-mono",
    bar: "bg-slate-400",
    card: "border-slate-200/80 hover:border-emerald-300",
  },
} as const;

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
      {/* ── Welcome Hero Banner ────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Live Workspace
            </span>
            <PartyBadge partyType={props.partyType} className="text-[10px]" />
            <RoleBadge role={props.role} className="text-[10px]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{props.title}</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 font-medium">{props.description}</p>
        </div>

        {primaryProject && (
          <Link
            href={`/projects/${primaryProject.id}/overview`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Open Active Project</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* ── Metric Cards Grid ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* ── Project Pulse & Action Queue ─────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Project Pulse */}
        <Card className="border-slate-200/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">Project Pulse</CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
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
                    className="group grid gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-slate-900 group-hover:text-emerald-900">
                          {project.name}
                        </p>
                        <Badge variant="outline" className="font-mono text-[10px] font-bold">
                          {project.code}
                        </Badge>
                        <StatusBadge status={project.status} className="text-[10px]" />
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 h-2 rounded-full bg-slate-200/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, project.progress))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">
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
        <Card className="border-slate-200/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">{props.queueTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {props.queue.map((key) => (
              <QueueRow key={key} metricKey={key} value={data.metrics[key]} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Role Shortcuts ────────────────────────────────────────────── */}
      <Card className="border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Role Quick Shortcuts</CardTitle>
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
            <p className="mt-1 text-xs font-semibold text-slate-600">{metric.label}</p>
          </div>
          {Icon && (
            <span className="rounded-lg bg-white p-2 shadow-2xs border border-slate-100">
              <Icon className="h-4 w-4 text-slate-500" aria-hidden />
            </span>
          )}
        </div>
        <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
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
          ? "border-amber-200 bg-amber-50/60"
          : "border-slate-100 bg-slate-50/80 hover:bg-slate-100/60"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={`h-4 w-4 shrink-0 ${isAlert ? "text-amber-600" : "text-slate-500"}`}
          aria-hidden
        />
        <span className="truncate text-xs font-medium text-slate-700">
          {QUEUE_LABELS[metricKey]}
        </span>
      </div>
      <span
        className={`text-xs font-mono font-bold ${
          isAlert ? "text-amber-800" : "text-slate-900"
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
      className="group flex items-start justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-2xs"
    >
      <div>
        <span className="block text-xs font-bold text-slate-900 group-hover:text-emerald-900">
          {shortcut.label}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
          {shortcut.detail}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-700 transition-colors mt-0.5" />
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
      ? "font-mono font-bold text-amber-700"
      : tone === "bad"
        ? "font-mono font-bold text-red-600"
        : "font-mono font-bold text-slate-900";
  return (
    <div>
      <p className={valueClass}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium text-slate-500">{label}</p>
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
