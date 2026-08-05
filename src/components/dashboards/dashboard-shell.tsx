import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const METRIC_TONE_STYLES = {
  good: {
    value: "text-2xl font-bold text-emerald-700",
    icon: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    card: "border-emerald-100 bg-emerald-50/30",
  },
  warn: {
    value: "text-2xl font-bold text-amber-600",
    icon: "bg-amber-100 text-amber-700",
    bar: "bg-amber-400",
    card: "border-amber-100 bg-amber-50/30",
  },
  bad: {
    value: "text-2xl font-bold text-red-600",
    icon: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    card: "border-red-100 bg-red-50/30",
  },
  default: {
    value: "text-2xl font-bold text-slate-900",
    icon: "bg-slate-100 text-slate-500",
    bar: "bg-slate-400",
    card: "",
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
    <div className="space-y-6 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-7">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-emerald-50 to-transparent md:block" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              {props.organizationName || "Organization overview"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{props.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{props.description}</p>
          </div>
          {primaryProject ? (
            <Link
              href={`/projects/${primaryProject.id}/overview`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              Open active project
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="dashboard-metrics-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="dashboard-metrics-heading" className="text-sm font-semibold text-slate-900">Portfolio at a glance</h2>
            <p className="mt-0.5 text-xs text-slate-500">The numbers that need your attention first.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {props.metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              value={data.metrics[metric.key]}
              href={primaryProject ? metric.href?.replace(":projectId", primaryProject.id) : metric.href}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Project pulse</CardTitle>
                <CardDescription className="mt-1">Delivery health across your visible portfolio.</CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">{data.projects.length} projects</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data.projects.length === 0 ? (
              <EmptyState title="No visible projects" description="Projects assigned to this role and party will appear here." />
            ) : (
              <div className="space-y-3">
                {data.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/overview`}
                    className="group block rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950 group-hover:text-emerald-900">{project.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px]">{project.code}</Badge>
                          <StatusBadge status={project.status} className="text-[10px]" />
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <progress className="h-2 min-w-0 flex-1 overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-500" value={project.progress} max={100} aria-label={`${project.name} schedule progress`} />
                          <span className="text-xs font-semibold text-slate-700">{project.progress}%</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Schedule progress</p>
                      </div>
                      <div className="grid grid-cols-3 gap-5 border-t border-slate-100 pt-3 text-left text-[11px] sm:text-right lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        <MiniStat label="Contract value" value={`ETB ${formatCurrency(project.contractValue)}`} />
                        <MiniStat label="Risks" value={project.openRisks} tone={project.openRisks > 0 ? "warn" : "default"} />
                        <MiniStat label="Incidents" value={project.openIncidents} tone={project.openIncidents > 0 ? "bad" : "default"} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-amber-100 p-2 text-amber-700"><ShieldAlert className="h-4 w-4" aria-hidden /></span>
              <div>
                <CardTitle className="text-base">{props.queueTitle}</CardTitle>
                <CardDescription className="mt-1">Items requiring review or action.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.queue.map((key) => <QueueRow key={key} metricKey={key} value={data.metrics[key]} />)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription className="mt-1">Move directly to the workspaces you use most.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {props.shortcuts.map((shortcut) => (
              <ShortcutCard key={shortcut.href} shortcut={{ ...shortcut, href: primaryProject ? shortcut.href.replace(":projectId", primaryProject.id) : shortcut.href }} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ metric, value, href }: { metric: DashboardMetric; value: number; href?: string }) {
  const tone = metric.tone ?? "default";
  const styles = METRIC_TONE_STYLES[tone];
  const Icon = metric.icon;
  const content = (
    <Card className={`h-full transition hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={styles.value}>{formatMetricValue(metric.key, value)}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
          </div>
          {Icon ? <span className={`rounded-lg p-2 ${styles.icon}`}><Icon className="h-4 w-4" aria-hidden /></span> : null}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full w-1/3 rounded-full ${styles.bar}`} /></div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function QueueRow({ metricKey, value }: { metricKey: MetricKey; value: number }) {
  const Icon = QUEUE_ICONS[metricKey] ?? HardHat;
  const isAlert = value > 0 && ["openRisks", "openIncidents", "openDefects", "openPunches"].includes(metricKey);
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${isAlert ? "border-amber-200 bg-white" : "border-slate-200/80 bg-white/70"}`}>
      <div className="flex min-w-0 items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${isAlert ? "text-amber-600" : "text-slate-400"}`} aria-hidden /><span className="truncate text-xs text-slate-700">{QUEUE_LABELS[metricKey]}</span></div>
      <span className={`text-sm font-bold ${isAlert ? "text-amber-700" : "text-slate-900"}`}>{formatMetricValue(metricKey, value)}</span>
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: DashboardShortcut }) {
  return <Link href={shortcut.href} className="group rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm">
    <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900 group-hover:text-emerald-900">{shortcut.label}</span><ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" aria-hidden /></div>
    <span className="mt-1.5 block text-xs leading-5 text-slate-500">{shortcut.detail}</span>
  </Link>;
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "warn" | "bad" }) {
  const valueClass = tone === "warn" ? "font-semibold text-amber-700" : tone === "bad" ? "font-semibold text-red-600" : "font-semibold text-slate-900";
  return <div><p className={`${valueClass} truncate`}>{value}</p><p className="mt-0.5 text-slate-400">{label}</p></div>;
}

function formatMetricValue(key: MetricKey, value: number) {
  if (key === "avgProgress") return `${value}%`;
  if (key === "equipmentDownHours") return `${value.toFixed(1)}h`;
  return value.toLocaleString("en-US");
}

export function makeShortcut(module: string, label: string, detail: string): DashboardShortcut {
  return { href: `/projects/:projectId/${module}`, label, detail };
}

export function metric(key: MetricKey, label?: string, module?: string, tone?: DashboardMetric["tone"], icon?: DashboardMetric["icon"]): DashboardMetric {
  return { key, label: label ?? titleCase(key), href: module ? module.startsWith("/") ? module : `/projects/:projectId/${module}` : undefined, tone, icon };
}
