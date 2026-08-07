"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { computeActivityStatus } from "@/lib/schedule-status";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  CalendarDays,
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";

type WbsNode = { id: string; code: string; name: string; nodeType?: string };
type Activity = {
  id: string;
  name: string;
  baselineStart: string | Date;
  baselineFinish: string | Date;
  plannedStart: string | Date;
  plannedFinish: string | Date;
  actualStart?: string | Date | null;
  actualFinish?: string | Date | null;
  progressPercent: number | string;
  status: string;
  wbsNode?: WbsNode | null;
  _count?: { stoppages: number };
  stoppages?: Array<{
    id: string;
    stoppageType: string;
    reason: string;
    startTime: string | Date;
    endTime: string | Date;
    responsibleParty?: string | null;
  }>;
};

type Stoppage = {
  id: string;
  stoppageType: string;
  reason: string;
  stationFrom?: string | null;
  stationTo?: string | null;
  startTime: string | Date;
  endTime: string | Date;
  inspectorComment?: string | null;
  contractorRepComment?: string | null;
  residentEngineerComment?: string | null;
  responsibleParty?: string | null;
  wbsNode?: WbsNode | null;
  scheduleActivity?: { id: string; name: string; status?: string } | null;
};

type Props = {
  projectId: string;
  activities: Activity[];
  stoppages: Stoppage[];
  wbsNodes: WbsNode[];
  canCreate: boolean;
  canApprove: boolean;
};

function varianceDays(baseline: Date | string, actual: Date | string | null | undefined) {
  if (!actual) return null;
  const b = new Date(baseline).getTime();
  const a = new Date(actual).getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

function durationHours(start: Date | string, end: Date | string) {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
}

const STOPPAGE_TYPES = [
  "WEATHER",
  "DESIGN_CHANGE",
  "MATERIAL_SHORTAGE",
  "CLIENT_INSTRUCTION",
  "EQUIPMENT_BREAKDOWN",
  "LABOR_DISPUTE",
  "FORCE_MAJEURE",
  "CONTRACTOR_DEFAULT",
  "OTHER",
] as const;

export function ScheduleView({
  projectId,
  activities,
  stoppages,
  wbsNodes,
  canCreate,
  canApprove,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("activities");
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showStoppageForm, setShowStoppageForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activity form
  const [actName, setActName] = useState("");
  const [actWbs, setActWbs] = useState(wbsNodes[0]?.id ?? "");
  const [baseStart, setBaseStart] = useState("");
  const [baseFinish, setBaseFinish] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planFinish, setPlanFinish] = useState("");

  // Stoppage form
  const [stopType, setStopType] = useState<(typeof STOPPAGE_TYPES)[number]>("WEATHER");
  const [reason, setReason] = useState("");
  const [stopWbs, setStopWbs] = useState("");
  const [stopActivity, setStopActivity] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [stationFrom, setStationFrom] = useState("");
  const [stationTo, setStationTo] = useState("");
  const [inspectorComment, setInspectorComment] = useState("");
  const [contractorComment, setContractorComment] = useState("");
  const [reComment, setReComment] = useState("");

  async function createActivity(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "activity",
          data: {
            wbsNodeId: actWbs,
            name: actName,
            baselineStart: baseStart,
            baselineFinish: baseFinish,
            plannedStart: planStart || baseStart,
            plannedFinish: planFinish || baseFinish,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return;
      }
      setShowActivityForm(false);
      setActName("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function createStoppage(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stoppages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stoppageType: stopType,
          reason,
          wbsNodeId: stopWbs || null,
          scheduleActivityId: stopActivity || null,
          startTime,
          endTime,
          stationFrom: stationFrom || null,
          stationTo: stationTo || null,
          inspectorComment: inspectorComment || null,
          contractorRepComment: contractorComment || null,
          residentEngineerComment: reComment || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return;
      }
      setShowStoppageForm(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function assignParty(stoppageId: string, party: string) {
    await fetch(`/api/projects/${projectId}/stoppages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        stoppageId,
        responsibleParty: party,
      }),
    });
    router.refresh();
  }

  const totalStopHours = stoppages.reduce(
    (s, x) => s + durationHours(x.startTime, x.endTime),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Schedule & Delay Log
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Logic-linked activities, baseline variance, and stoppage cause capture
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowStoppageForm(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
                <AlertTriangle className="h-4 w-4 mr-1 text-[#C04928]" />
                Log stoppage
              </Button>
              <Button size="sm" onClick={() => setShowActivityForm(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs">
                <Plus className="h-4 w-4 mr-1" />
                Add activity
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Activities</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{activities.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stoppages logged</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{stoppages.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stoppage hours</p>
          <p className="mt-1 text-3xl font-bold text-[#C04928] tabular-nums">{totalStopHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Activity form */}
      {showActivityForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#2C2420]">New schedule activity</h3>
          </div>
          <form onSubmit={createActivity} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Name</Label>
              <Input value={actName} onChange={(e) => setActName(e.target.value)} required className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">WBS node</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                value={actWbs}
                onChange={(e) => setActWbs(e.target.value)}
                required
              >
                {wbsNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.code} — {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Baseline start</Label>
              <Input type="date" value={baseStart} onChange={(e) => setBaseStart(e.target.value)} required className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Baseline finish</Label>
              <Input type="date" value={baseFinish} onChange={(e) => setBaseFinish(e.target.value)} required className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Planned start</Label>
              <Input type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Planned finish</Label>
              <Input type="date" value={planFinish} onChange={(e) => setPlanFinish(e.target.value)} className="bg-white border-[#D8D0C5]" />
            </div>
            {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create activity"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowActivityForm(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stoppage form — three-party structure */}
      {showStoppageForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#2C2420]">On-site work stoppage report</h3>
            <p className="mt-1 text-xs text-stone-500">
              Three-party contemporaneous record (Inspector / Contractor / Resident Engineer) —
              links delay cause to schedule for claims and variance.
            </p>
          </div>
          <form onSubmit={createStoppage} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Stoppage type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                value={stopType}
                onChange={(e) => setStopType(e.target.value as any)}
              >
                {STOPPAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Linked activity (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                value={stopActivity}
                onChange={(e) => setStopActivity(e.target.value)}
              >
                <option value="">—</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">WBS node (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                value={stopWbs}
                onChange={(e) => setStopWbs(e.target.value)}
              >
                <option value="">—</option>
                {wbsNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.code} — {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={2} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Start</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">End</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Station from</Label>
              <Input value={stationFrom} onChange={(e) => setStationFrom(e.target.value)} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-stone-600">Station to</Label>
              <Input value={stationTo} onChange={(e) => setStationTo(e.target.value)} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Work Inspector comment</Label>
              <Textarea value={inspectorComment} onChange={(e) => setInspectorComment(e.target.value)} rows={2} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Contractor Representative comment</Label>
              <Textarea value={contractorComment} onChange={(e) => setContractorComment(e.target.value)} rows={2} className="bg-white border-[#D8D0C5]" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-stone-600">Resident Engineer comment</Label>
              <Textarea value={reComment} onChange={(e) => setReComment(e.target.value)} rows={2} className="bg-white border-[#D8D0C5]" />
            </div>
            {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
            <div className="flex gap-2 sm:col-span-2 pt-2">
              <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save stoppage"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowStoppageForm(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="stoppages">
            Stoppages ({stoppages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-4">
          {activities.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No activities yet"
              description="Create schedule activities linked to WBS with a locked baseline."
            />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EFE8DE] bg-[#FAF7F2] text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">WBS</th>
                    <th className="px-4 py-3">Baseline</th>
                    <th className="px-4 py-3">Planned</th>
                    <th className="px-4 py-3 text-right">Progress</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                    <th className="px-4 py-3 text-right">Stops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DE]">
                  {activities.map((a) => {
                    const finish = a.actualFinish || a.plannedFinish;
                    const v = varianceDays(a.baselineFinish, finish);
                    return (
                      <tr key={a.id} className="hover:bg-[#FAF7F2]/60">
                        <td className="px-4 py-3 font-medium text-stone-800">{a.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-600">{a.wbsNode?.code ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-600">
                          {formatDate(a.baselineStart)} → {formatDate(a.baselineFinish)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-600">
                          {formatDate(a.plannedStart)} → {formatDate(a.plannedFinish)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-800">
                          {Number(a.progressPercent).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={a.status} />
                            {computeActivityStatus({
                              plannedStart: new Date(a.plannedStart),
                              plannedFinish: new Date(a.plannedFinish),
                              actualStart: a.actualStart ? new Date(a.actualStart) : null,
                              actualFinish: a.actualFinish ? new Date(a.actualFinish) : null,
                              progressPercent: Number(a.progressPercent),
                              status: a.status,
                            }).status === "OVERDUE" && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                <Clock className="h-3 w-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-3 text-right tabular-nums text-xs font-medium ${
                            v != null && v > 0
                              ? "text-red-600"
                              : v != null && v < 0
                                ? "text-emerald-600"
                                : "text-stone-500"
                          }`}
                        >
                          {v == null ? "—" : v > 0 ? `+${v}d` : `${v}d`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(a._count?.stoppages ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <Clock className="h-3.5 w-3.5" />
                              {a._count?.stoppages}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stoppages" className="mt-4">
          {stoppages.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No stoppages logged"
              description="Record work stoppages with cause and three-party comments — the highest-leverage contemporaneous claim record."
            />
          ) : (
            <div className="space-y-3">
              {stoppages.map((s) => (
                <div key={s.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={s.stoppageType} />
                        {s.responsibleParty && (
                          <StatusBadge status={s.responsibleParty} />
                        )}
                        <span className="text-xs text-stone-500">
                          {formatDateTime(s.startTime)} → {formatDateTime(s.endTime)} (
                          {durationHours(s.startTime, s.endTime).toFixed(1)}h)
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-900">{s.reason}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {s.wbsNode ? `${s.wbsNode.code} · ` : ""}
                        {s.scheduleActivity?.name ?? "No activity linked"}
                        {s.stationFrom ? ` · Stn ${s.stationFrom}` : ""}
                        {s.stationTo ? `–${s.stationTo}` : ""}
                      </p>
                    </div>
                    {canApprove && !s.responsibleParty && (
                      <select
                        className="rounded-lg border border-[#D8D0C5] bg-white px-2 py-1 text-xs text-stone-800"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) assignParty(s.id, e.target.value);
                        }}
                      >
                        <option value="">Assign responsibility…</option>
                        {["CLIENT", "CONSULTANT", "CONTRACTOR", "SUBCONTRACTOR", "NEUTRAL"].map(
                          (p) => (
                            <option key={p} value={p}>
                              {titleCase(p)}
                            </option>
                          )
                        )}
                      </select>
                    )}
                  </div>
                  {(s.inspectorComment || s.contractorRepComment || s.residentEngineerComment) && (
                    <div className="mt-3 grid gap-2 border-t border-[#EFE8DE] pt-3 text-xs sm:grid-cols-3">
                      <div>
                        <p className="font-semibold text-stone-700">Inspector</p>
                        <p className="text-stone-500">{s.inspectorComment || "—"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-700">Contractor</p>
                        <p className="text-stone-500">{s.contractorRepComment || "—"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-700">Resident Engineer</p>
                        <p className="text-stone-500">{s.residentEngineerComment || "—"}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
