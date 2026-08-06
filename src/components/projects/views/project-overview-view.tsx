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
  Activity,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import type { ProjectHeaderData, ProjectOverviewStats } from "@/lib/services/project.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKSPACE_TAB_LABELS, formatDate } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function ProjectOverviewView({
  project,
  stats,
}: {
  project: ProjectHeaderData;
  stats: ProjectOverviewStats;
}) {
  return (
    <div className="project-overview space-y-6">
      {/* ── Overview Header Banner ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Project Workspace
            </span>
            <span className="text-xs text-slate-400 font-medium">• Updated in real-time</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Project Overview & Performance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {project.allowedTabs.includes("schedule") && (
            <Link href={`/projects/${project.id}/schedule`}>
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 font-bold">
                <CalendarDays className="h-3.5 w-3.5" />
                Schedule View
              </Button>
            </Link>
          )}

          {project.allowedTabs.includes("wbs") && (
            <Link href={`/projects/${project.id}/wbs`}>
              <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold">
                <FolderTree className="h-3.5 w-3.5" />
                WBS View
              </Button>
            </Link>
          )}
        </div>
      </div>

      {stats.scopeBanner && (
        <p className="rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600">
          {stats.scopeBanner}
        </p>
      )}

      {/* ── KPI Summary Cards Grid ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-emerald-600 border-slate-200/80 shadow-2xs">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900 font-mono">{stats.avgProgress}%</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">Average Schedule Progress</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, stats.avgProgress))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 border-slate-200/80 shadow-2xs">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900 font-mono">{stats.openRisks}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">Open Risks</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-400">Risk register entries</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500 border-slate-200/80 shadow-2xs">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900 font-mono">{stats.openIncidents}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">Safety Incidents</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-400">Unresolved HSE incidents</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-indigo-600 border-slate-200/80 shadow-2xs">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900 font-mono">
                  {stats.showOperationalMetrics ? stats.pendingDailyReports : "—"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">Pending Daily Reports</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <ClipboardList className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-400">Awaiting sign-off</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Breakdown & Stoppages Grid ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Project Breakdown & Metrics</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between py-3">
              <span className="flex items-center gap-2 font-medium text-slate-600">
                <FolderTree className="h-4 w-4 text-slate-400" /> WBS Nodes
              </span>
              <span className="font-mono font-bold text-slate-900">{stats.wbsCount}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="flex items-center gap-2 font-medium text-slate-600">
                <HardHat className="h-4 w-4 text-slate-400" /> Schedule Activities
              </span>
              <span className="font-mono font-bold text-slate-900">{stats.activityCount}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="flex items-center gap-2 font-medium text-slate-600">
                <FileCheck2 className="h-4 w-4 text-slate-400" /> Total IPC Measurements
              </span>
              <span className="font-mono font-bold text-slate-900">
                {stats.showCommercialMetrics ? stats.measurementCount : "—"}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="flex items-center gap-2 font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-slate-400" /> Certified Payments
              </span>
              <span className="font-mono font-bold text-slate-900">
                {stats.showCommercialMetrics ? stats.certifiedPaymentsCount : "—"}
              </span>
            </div>
            {stats.showOperationalMetrics && (
              <div className="flex justify-between py-3">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <Truck className="h-4 w-4 text-slate-400" /> Equipment Fleet Logs
                </span>
                <span className="font-mono font-bold text-slate-900">{stats.equipmentCount}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Recent Work Stoppages</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {stats.recentStoppages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400 font-medium">
                No recent work stoppages reported for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentStoppages.map((stoppage) => (
                  <div
                    key={stoppage.id}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{stoppage.stoppageType}</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {formatDate(stoppage.startTime)}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium">{stoppage.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Authorized Workspace Modules Launchpad ──────────────────── */}
      <Card className="border-slate-200/80 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Workspace Access
              </span>
              <CardTitle className="mt-0.5 text-base font-bold text-slate-900">
                Authorized Workspace Modules
              </CardTitle>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
              {project.allowedTabs.length} Authorized
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {project.allowedTabs.map((tab) => (
              <Link
                key={tab}
                href={`/projects/${project.id}/${tab}`}
                className="group flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-2xs"
              >
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                  {WORKSPACE_TAB_LABELS[tab] ?? tab}
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700 transition-colors" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
