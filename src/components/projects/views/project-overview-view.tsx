import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FolderTree,
  HardHat,
  Layers,
  ShieldAlert,
  Truck,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { WORKSPACE_TAB_LABELS, formatDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

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

type ProjectOverviewStats = {
  avgProgress: number;
  openRisks: number;
  openIncidents: number;
  pendingDailyReports: number;
  showOperationalMetrics: boolean;
  showCommercialMetrics: boolean;
  wbsCount: number;
  activityCount: number;
  measurementCount: number;
  certifiedPaymentsCount: number;
  equipmentCount: number;
  recentStoppages: Array<{
    id: string;
    stoppageType: string;
    reason: string;
    startTime: Date;
  }>;
  scopeBanner?: string;
};

export function ProjectOverviewView({
  project,
  stats,
}: {
  project: ProjectHeaderData;
  stats: ProjectOverviewStats;
}) {
  const allowedSet = new Set(project.allowedTabs);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Project Overview & Performance
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {project.name} ({project.code}) · Live project workspace
          </p>
        </div>
        <div className="flex gap-2">
          {allowedSet.has("schedule") && (
            <Link
              href={`/projects/${project.id}/schedule`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C04928] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A33A1F]"
            >
              <CalendarDays className="h-4 w-4" /> Schedule View
            </Link>
          )}
          {allowedSet.has("wbs") && (
            <Link
              href={`/projects/${project.id}/wbs`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8D0C5] bg-white px-4 py-2 text-xs font-medium text-stone-800 hover:bg-[#FAF7F2]"
            >
              <FolderTree className="h-4 w-4" /> WBS Tree
            </Link>
          )}
        </div>
      </div>

      {stats.scopeBanner && (
        <p className="rounded-lg border border-border-default bg-surface-sunken px-4 py-2.5 text-xs font-medium text-fg-muted">
          {stats.scopeBanner}
        </p>
      )}

      {/* ── KPI Summary Cards Grid ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Average Schedule Progress"
          value={`${stats.avgProgress}%`}
          color="emerald"
          progress={stats.avgProgress}
          icon={<Layers className="h-5 w-5" />}
        />

        <MetricCard
          label="Open Risks"
          value={stats.openRisks}
          color="amber"
          trend={stats.openRisks > 0 ? { direction: "up", label: "Needs attention" } : { direction: "neutral", label: "Under control" }}
          icon={<AlertTriangle className="h-5 w-5" />}
        />

        <MetricCard
          label="Safety Incidents"
          value={stats.openIncidents}
          color="red"
          trend={stats.openIncidents > 0 ? { direction: "up", label: "Action required" } : { direction: "neutral", label: "No incidents" }}
          icon={<ShieldAlert className="h-5 w-5" />}
        />

        <MetricCard
          label="Pending Daily Reports"
          value={stats.pendingDailyReports}
          color="indigo"
          icon={<ClipboardList className="h-5 w-5" />}
        />
      </div>

      {/* ── Detailed Metrics Grid ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Operational Metrics */}
        {stats.showOperationalMetrics && (
          <Card>
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-base font-bold text-fg-default">Operational Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-3">
              <MiniStat label="WBS Nodes" value={stats.wbsCount} href={allowedSet.has("wbs") ? `/projects/${project.id}/wbs` : undefined} />
              <MiniStat label="Schedule Activities" value={stats.activityCount} href={allowedSet.has("schedule") ? `/projects/${project.id}/schedule` : undefined} />
              <MiniStat label="Equipment Items" value={stats.equipmentCount} href={allowedSet.has("resources") ? `/projects/${project.id}/resources` : undefined} />
              <MiniStat label="Pending Daily Reports" value={stats.pendingDailyReports} href={allowedSet.has("daily") ? `/projects/${project.id}/daily` : undefined} />
            </CardContent>
          </Card>
        )}

        {/* Commercial Metrics */}
        {stats.showCommercialMetrics && (
          <Card>
            <CardHeader className="pb-3 border-b border-border-subtle">
              <CardTitle className="text-base font-bold text-fg-default">Commercial Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Measurements" value={stats.measurementCount} href={allowedSet.has("cost") ? `/projects/${project.id}/cost` : undefined} />
              <MiniStat label="Certified Payments" value={stats.certifiedPaymentsCount} href={allowedSet.has("cost") ? `/projects/${project.id}/cost` : undefined} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Recent Stoppages ──────────────────────────────────────────── */}
      {stats.recentStoppages.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b border-border-subtle">
            <CardTitle className="text-base font-bold text-fg-default">Recent Stoppages</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {stats.recentStoppages.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-sunken/50 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-subtle">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-fg-default">{s.stoppageType.replace(/_/g, " ")}</p>
                  <p className="text-xs text-fg-muted truncate">{s.reason}</p>
                </div>
                <span className="text-xs text-fg-subtle shrink-0">{formatDate(s.startTime)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Quick Access to Modules ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-bold text-fg-default">Quick Module Access</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {project.allowedTabs.slice(0, 9).map((tab) => (
              <Link
                key={tab}
                href={`/projects/${project.id}/${tab}`}
                className="group flex items-center justify-between rounded-lg border border-border-default bg-surface-raised px-3.5 py-2.5 transition-all hover:border-primary/30 hover:bg-primary-subtle/30 hover:shadow-xs"
              >
                <span className="text-xs font-semibold text-fg-default group-hover:text-primary">
                  {WORKSPACE_TAB_LABELS[tab] ?? tab}
                </span>
                <ArrowUpRight className="h-4 w-4 text-fg-subtle group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-border-subtle bg-surface-sunken/50 p-3 transition-all hover:bg-surface-sunken">
      <p className="text-lg font-black text-fg-default font-mono">{value}</p>
      <p className="text-[11px] font-medium text-fg-muted">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}