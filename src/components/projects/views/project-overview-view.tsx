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
} from "lucide-react";
import type { ProjectHeaderData, ProjectOverviewStats } from "@/lib/services/project.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKSPACE_TAB_LABELS, formatDate } from "@/lib/constants";

export function ProjectOverviewView({
  project,
  stats,
}: {
  project: ProjectHeaderData;
  stats: ProjectOverviewStats;
}) {
  return (
<<<<<<< HEAD
    <div className="project-overview space-y-6">
      <div className="project-overview-heading">
        <div>
          <p className="eyebrow-label">Project overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Performance at a glance</h1>
        </div>
        <p className="project-overview-date">Updated from live project records</p>
      </div>

      {stats.scopeBanner ? (
        <p className="scope-banner rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
=======
    <div className="space-y-6">
      {stats.scopeBanner ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
>>>>>>> 1d602ff (feat:update on the ui)
          {stats.scopeBanner}
        </p>
      ) : null}

<<<<<<< HEAD
      <div className="project-stat-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
=======
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
>>>>>>> 1d602ff (feat:update on the ui)
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.avgProgress}%</p>
                <p className="mt-0.5 text-xs text-slate-500">Average Progress</p>
              </div>
              <Layers className="h-6 w-6 text-emerald-600" aria-hidden />
            </div>
            <progress
              className="project-progress mt-3"
              value={Math.min(100, Math.max(0, stats.avgProgress))}
              max="100"
              aria-label="Average project progress"
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.openRisks}</p>
                <p className="mt-0.5 text-xs text-slate-500">Open Risks</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden />
            </div>
            <p className="mt-2 text-xs text-slate-400">Risk register entries</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.openIncidents}</p>
                <p className="mt-0.5 text-xs text-slate-500">Safety Incidents</p>
              </div>
              <ShieldAlert className="h-6 w-6 text-red-500" aria-hidden />
            </div>
            <p className="mt-2 text-xs text-slate-400">Unresolved HSE incidents</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.showOperationalMetrics ? stats.pendingDailyReports : "—"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Pending Daily Reports</p>
              </div>
              <ClipboardList className="h-6 w-6 text-indigo-600" aria-hidden />
            </div>
            <p className="mt-2 text-xs text-slate-400">Awaiting sign-off</p>
          </CardContent>
        </Card>
      </div>

      <div className="project-detail-grid grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Breakdown & Metrics</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-600">
                <FolderTree className="h-4 w-4 text-slate-400" /> WBS Nodes
              </span>
              <span className="font-semibold text-slate-900">{stats.wbsCount}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-600">
                <HardHat className="h-4 w-4 text-slate-400" /> Schedule Activities
              </span>
              <span className="font-semibold text-slate-900">{stats.activityCount}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-600">
                <FileCheck2 className="h-4 w-4 text-slate-400" /> Total IPC Measurements
              </span>
              <span className="font-semibold text-slate-900">
                {stats.showCommercialMetrics ? stats.measurementCount : "—"}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-slate-400" /> Certified Payments
              </span>
              <span className="font-semibold text-slate-900">
                {stats.showCommercialMetrics ? stats.certifiedPaymentsCount : "—"}
              </span>
            </div>
            {stats.showOperationalMetrics ? (
              <div className="flex justify-between py-2.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <Truck className="h-4 w-4 text-slate-400" /> Equipment Fleet Logs
                </span>
                <span className="font-semibold text-slate-900">{stats.equipmentCount}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Work Stoppages</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentStoppages.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No recent work stoppages reported for this project.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentStoppages.map((stoppage) => (
                  <div
                    key={stoppage.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{stoppage.stoppageType}</span>
                      <span className="text-slate-400">{formatDate(stoppage.startTime)}</span>
                    </div>
                    <p className="mt-1 text-slate-600">{stoppage.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="authorized-modules-card">
        <CardHeader className="pb-3">
          <p className="eyebrow-label">Workspace access</p>
          <CardTitle className="mt-1 text-base">Authorized Workspace Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {project.allowedTabs.map((tab) => (
              <Link
                key={tab}
                href={`/projects/${project.id}/${tab}`}
                className="group flex items-center justify-between rounded-lg border border-slate-200 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/30"
              >
                <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-900">
                  {WORKSPACE_TAB_LABELS[tab] ?? tab}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-700" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
