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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { WORKSPACE_TAB_LABELS, formatDate } from "@/lib/constants";

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  overview: Layers,
  wbs: FolderTree,
  daily: ClipboardList,
  schedule: HardHat,
  cost: FileCheck2,
  risk: AlertTriangle,
  safety: ShieldAlert,
  quality: CheckCircle2,
  resources: Truck,
};

export function ProjectOverviewView({ project, stats }: { project: ProjectHeaderData; stats: ProjectOverviewStats }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Executive snapshot</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{project.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">A live view of delivery progress, project controls, and the latest exceptions.</p>
          </div>
          <div className="min-w-56 rounded-xl border border-emerald-100 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-4"><span className="text-xs font-medium text-slate-500">Average progress</span><span className="text-lg font-bold text-emerald-700">{stats.avgProgress}%</span></div>
            <progress className="mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-emerald-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-600" value={stats.avgProgress} max={100} aria-label="Average project progress" />
            <p className="mt-2 text-[11px] text-slate-400">Schedule performance across tracked activities</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Project health indicators">
        <HealthCard label="Open risks" value={stats.openRisks} detail="Risk register entries" icon={AlertTriangle} tone="amber" />
        <HealthCard label="Safety incidents" value={stats.openIncidents} detail="Unresolved HSE incidents" icon={ShieldAlert} tone="red" />
        <HealthCard label="Pending reports" value={stats.pendingDailyReports} detail="Awaiting sign-off" icon={ClipboardList} tone="indigo" />
        <HealthCard label="Project progress" value={`${stats.avgProgress}%`} detail="Average schedule progress" icon={Layers} tone="emerald" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-base">Delivery controls</CardTitle><CardDescription className="mt-1">Operational totals across the project.</CardDescription></CardHeader>
          <CardContent className="divide-y divide-slate-100 pt-1 text-sm">
            <ControlRow icon={FolderTree} label="WBS nodes" value={stats.wbsCount} />
            <ControlRow icon={HardHat} label="Schedule activities" value={stats.activityCount} />
            <ControlRow icon={FileCheck2} label="IPC measurements" value={stats.measurementCount} />
            <ControlRow icon={CheckCircle2} label="Certified payments" value={stats.certifiedPaymentsCount} />
            <ControlRow icon={Truck} label="Equipment fleet logs" value={stats.equipmentCount} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-base">Recent work stoppages</CardTitle><CardDescription className="mt-1">The latest interruptions recorded by the field team.</CardDescription></CardHeader>
          <CardContent className="pt-4">
            {stats.recentStoppages.length === 0 ? (
              <EmptyState title="No recent work stoppages" description="No interruptions have been reported for this project." className="py-8" />
            ) : (
              <div className="space-y-3">
                {stats.recentStoppages.map((stoppage) => (
                  <div key={stoppage.id} className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-4 pl-5 text-xs before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-r-full before:bg-amber-400">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-900">{stoppage.stoppageType}</span><span className="text-slate-400">{formatDate(stoppage.startTime)}</span></div>
                    <p className="mt-1.5 leading-5 text-slate-600">{stoppage.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-base">Authorized workspace modules</CardTitle><CardDescription className="mt-1">Jump into the project areas available to your role.</CardDescription></CardHeader>
        <CardContent className="pt-4"><div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {project.allowedTabs.map((tab) => {
            const Icon = MODULE_ICONS[tab] ?? FolderTree;
            return <Link key={tab} href={`/projects/${project.id}/${tab}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"><span className="rounded-lg bg-slate-100 p-2 text-slate-500 transition group-hover:bg-emerald-100 group-hover:text-emerald-700"><Icon className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1 text-xs font-semibold text-slate-800 group-hover:text-emerald-900">{WORKSPACE_TAB_LABELS[tab] ?? tab}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-700" aria-hidden /></Link>;
          })}
        </div></CardContent>
      </Card>
    </div>
  );
}

function HealthCard({ label, value, detail, icon: Icon, tone }: { label: string; value: React.ReactNode; detail: string; icon: React.ComponentType<{ className?: string }>; tone: "amber" | "red" | "indigo" | "emerald" }) {
  const styles = { amber: "border-amber-100 bg-amber-50/30 text-amber-600", red: "border-red-100 bg-red-50/30 text-red-600", indigo: "border-indigo-100 bg-indigo-50/30 text-indigo-600", emerald: "border-emerald-100 bg-emerald-50/30 text-emerald-700" }[tone];
  return <Card className={styles}><CardContent className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p></div><Icon className="h-5 w-5" aria-hidden /></div><p className="mt-3 text-xs text-slate-400">{detail}</p></CardContent></Card>;
}

function ControlRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3 py-3"><span className="flex items-center gap-2.5 text-slate-600"><Icon className="h-4 w-4 text-slate-400" aria-hidden />{label}</span><span className="font-semibold text-slate-950">{value}</span></div>;
}
