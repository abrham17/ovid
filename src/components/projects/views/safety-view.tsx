"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
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
  ShieldAlert,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";

type WbsNode = { id: string; code: string; name: string };
type Activity = { id: string; name: string; status?: string };

type Observation = {
  id: string;
  hazardDescription: string;
  severity: string;
  immediateActionTaken?: string | null;
  observedAt: string | Date;
  wbsNode?: WbsNode | null;
  observedBy?: { id: string; fullName: string; role?: string } | null;
  _count?: { incidents: number };
};

type Incident = {
  id: string;
  incidentType: string;
  description: string;
  correctiveAction?: string | null;
  status: string;
  createdAt: string | Date;
  wbsNode?: WbsNode | null;
  linkedObservation?: {
    id: string;
    hazardDescription: string;
    severity: string;
  } | null;
  correctiveActionVerifiedBy?: { id: string; fullName: string } | null;
  affectsScheduleActivity?: Activity | null;
};

type Props = {
  projectId: string;
  observations: Observation[];
  incidents: Incident[];
  wbsNodes: WbsNode[];
  activities: Activity[];
  canCreate: boolean;
  canUpdate: boolean;
  canApprove: boolean;
};

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const INCIDENT_TYPES = [
  "NEAR_MISS",
  "FIRST_AID",
  "MEDICAL_TREATMENT",
  "LOST_TIME",
  "FATALITY",
] as const;

function severityClass(s: string) {
  switch (s) {
    case "CRITICAL":
    case "HIGH":
      return "bg-[#FDE8E2] text-[#C04928]";
    case "LOW":
      return "bg-[#E3F2E6] text-[#2E7D32]";
    default:
      return "bg-[#F2ECE1] text-stone-800";
  }
}

export function SafetyView({
  projectId,
  observations,
  incidents,
  wbsNodes,
  activities,
  canCreate,
  canUpdate,
  canApprove,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("observations");
  const [showObsForm, setShowObsForm] = useState(false);
  const [showIncForm, setShowIncForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [closeAction, setCloseAction] = useState("");

  // Observation form
  const [obsWbs, setObsWbs] = useState(wbsNodes[0]?.id ?? "");
  const [obsHazard, setObsHazard] = useState("");
  const [obsSeverity, setObsSeverity] = useState<(typeof SEVERITIES)[number]>("MEDIUM");
  const [obsAction, setObsAction] = useState("");
  const [obsAt, setObsAt] = useState(() => new Date().toISOString().slice(0, 16));

  // Incident form
  const [incWbs, setIncWbs] = useState(wbsNodes[0]?.id ?? "");
  const [incType, setIncType] = useState<(typeof INCIDENT_TYPES)[number]>("NEAR_MISS");
  const [incDesc, setIncDesc] = useState("");
  const [incCorrective, setIncCorrective] = useState("");
  const [incObs, setIncObs] = useState("");
  const [incActivity, setIncActivity] = useState("");

  const openIncidents = incidents.filter((i) => i.status !== "CLOSED");
  const blocking = incidents.filter(
    (i) => i.status !== "CLOSED" && i.affectsScheduleActivity
  );

  async function submitObservation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "observation",
          data: {
            wbsNodeId: obsWbs,
            hazardDescription: obsHazard,
            severity: obsSeverity,
            immediateActionTaken: obsAction || null,
            observedAt: obsAt,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return;
      }
      setShowObsForm(false);
      setObsHazard("");
      setObsAction("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function submitIncident(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "incident",
          data: {
            wbsNodeId: incWbs,
            incidentType: incType,
            description: incDesc,
            correctiveAction: incCorrective || null,
            linkedObservationId: incObs || null,
            affectsScheduleActivityId: incActivity || null,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return;
      }
      setShowIncForm(false);
      setIncDesc("");
      setIncCorrective("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(
    incidentId: string,
    status: "OPEN" | "ACTION_PENDING" | "CLOSED",
    correctiveAction?: string
  ) {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/safety`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "status",
          incidentId,
          status,
          correctiveAction: correctiveAction || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Status update failed");
        return;
      }
      setCloseId(null);
      setCloseAction("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            HSE Safety & Hazards
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Hazard observations, incident records, and corrective action tracking
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowObsForm(true)}>
              <Plus className="h-4 w-4 mr-1 text-[#C04928]" />
              Observation
            </Button>
            <Button size="sm" onClick={() => setShowIncForm(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Log incident
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Observations</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{observations.length}</p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Open incidents</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{openIncidents.length}</p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Closed</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">
              {incidents.filter((i) => i.status === "CLOSED").length}
            </p>
           
</div>
        <div className={`rounded-2xl border p-5 shadow-xs ${blocking.length ? "border-[#C04928] bg-[#FDE8E2]" : "border-[#EFE8DE] bg-[#FDFCF9]"}`}>
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Schedule-blocking</p>
 
            <p className="mt-1 text-3xl font-bold text-[#C04928] tabular-nums">{blocking.length}</p>
           
</div>
      </div>

      {blocking.length > 0 && (
        <div className="rounded-2xl border border-[#F8E3DD] bg-[#FDF3F0] p-4 flex items-start gap-3">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-[#C04928]" />
          <div>
            <p className="font-semibold text-[#8A341C]">Safety-blocked activities</p>
            <ul className="mt-1 space-y-1 text-sm text-[#C04928]">
              {blocking.map((i) => (
                <li key={i.id}>
                  <span className="font-medium">{i.affectsScheduleActivity?.name}</span>
                  {" — "}
                  {titleCase(i.incidentType)} still {titleCase(i.status)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Observation form */}
      {showObsForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <div>
    <h3 className="font-serif text-xl font-bold text-[#2C2420]">Safety observation</h3>
    <p className="mt-1 text-xs text-stone-500">
              Log hazards the same day — design target is daily habit, not weekly catch-up.
            </p>
  </div>
  <form onSubmit={submitObservation} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>WBS location</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={obsWbs}
                  onChange={(e) => setObsWbs(e.target.value)}
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
                <Label>Severity</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={obsSeverity}
                  onChange={(e) => setObsSeverity(e.target.value as any)}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Observed at</Label>
                <Input
                  type="datetime-local"
                  value={obsAt}
                  onChange={(e) => setObsAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Hazard description</Label>
                <Textarea
                  value={obsHazard}
                  onChange={(e) => setObsHazard(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Immediate action taken</Label>
                <Textarea
                  value={obsAction}
                  onChange={(e) => setObsAction(e.target.value)}
                  rows={2}
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save observation"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowObsForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
</div>
      )}

      {/* Incident form */}
      {showIncForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <div>
    <h3 className="font-serif text-xl font-bold text-[#2C2420]">Safety incident</h3>
    <p className="mt-1 text-xs text-stone-500">
              Link to an observation and optionally block a schedule activity until closeout.
            </p>
  </div>
  <form onSubmit={submitIncident} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>WBS location</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={incWbs}
                  onChange={(e) => setIncWbs(e.target.value)}
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
                <Label>Incident type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={incType}
                  onChange={(e) => setIncType(e.target.value as any)}
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Linked observation (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={incObs}
                  onChange={(e) => setIncObs(e.target.value)}
                >
                  <option value="">—</option>
                  {observations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.wbsNode?.code} · {o.hazardDescription.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Blocks schedule activity (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={incActivity}
                  onChange={(e) => setIncActivity(e.target.value)}
                >
                  <option value="">— none —</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Corrective action (can complete later)</Label>
                <Textarea
                  value={incCorrective}
                  onChange={(e) => setIncCorrective(e.target.value)}
                  rows={2}
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log incident"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowIncForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
</div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="observations">
            Observations ({observations.length})
          </TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="mt-4">
          {observations.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No observations yet"
              description="Record hazards as they are seen — same-day logging is the design target."
            />
          ) : (
            <div className="space-y-3">
              {observations.map((o) => (
                <div key={o.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs">
                  <div className="p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClass(o.severity)}`}
                          >
                            {titleCase(o.severity)}
                          </span>
                          <span className="text-xs text-stone-500">
                            {formatDateTime(o.observedAt)}
                          </span>
                          {o.wbsNode && (
                            <span className="font-mono text-xs text-emerald-700">
                              {o.wbsNode.code}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-stone-900">
                          {o.hazardDescription}
                        </p>
                        {o.immediateActionTaken && (
                          <p className="mt-1 text-xs text-stone-600">
                            <span className="font-semibold">Action: </span>
                            {o.immediateActionTaken}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-stone-400">
                          Observed by {o.observedBy?.fullName ?? "—"}
                          {(o._count?.incidents ?? 0) > 0
                            ? ` · ${o._count!.incidents} linked incident(s)`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
</div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          {incidents.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No incidents logged"
              description="Incidents require corrective action and verified closeout before schedule blocks are released."
            />
          ) : (
          <div className="space-y-3">
              {incidents.map((i) => (
                <div
                  key={i.id}
                  className={`rounded-2xl border bg-[#FDFCF9] p-6 space-y-4 shadow-xs ${
                    i.status !== "CLOSED" && i.affectsScheduleActivity
                      ? "border-[#F8E3DD]"
                      : "border-[#EFE8DE]"
                  }`}
                >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={i.incidentType} />
                          <StatusBadge status={i.status} />
                          {i.wbsNode && (
                            <span className="font-mono text-xs text-emerald-700">
                              {i.wbsNode.code}
                            </span>
                          )}
                          <span className="text-xs text-stone-500">
                            {formatDate(i.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-stone-900">
                          {i.description}
                        </p>
                        {i.linkedObservation && (
                          <p className="mt-1 text-xs text-stone-500">
                            From observation: {i.linkedObservation.hazardDescription.slice(0, 80)}
                          </p>
                        )}
                        {i.correctiveAction && (
                          <p className="mt-1 text-xs text-stone-600">
                            <span className="font-semibold">Corrective action: </span>
                            {i.correctiveAction}
                          </p>
                        )}
                        {i.correctiveActionVerifiedBy && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified by {i.correctiveActionVerifiedBy.fullName}
                          </p>
                        )}
                        {i.affectsScheduleActivity && (
                          <p className="mt-1 text-xs font-medium text-[#C04928]">
                            Blocks activity: {i.affectsScheduleActivity.name}
                          </p>
                        )}
                      </div>

                      {/* Workflow actions */}
                      <div className="flex flex-col gap-1">
                        {i.status === "OPEN" && canUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => setStatus(i.id, "ACTION_PENDING")}
                            className="border-[#D8D0C5] hover:bg-[#FAF7F2] text-stone-700"
                          >
                            Mark action pending
                          </Button>
                        )}
                        {(i.status === "OPEN" || i.status === "ACTION_PENDING") &&
                          canApprove && (
                            <>
                              {closeId === i.id ? (
                                <div className="w-56 space-y-2 rounded-xl border border-[#EFE8DE] bg-white p-2">
                                  <Textarea
                                    placeholder="Confirm corrective action…"
                                    value={closeAction}
                                    onChange={(e) => setCloseAction(e.target.value)}
                                    rows={2}
                                    className="text-xs bg-white border-[#D8D0C5]"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      disabled={loading}
                                      onClick={() => setStatus(i.id, "CLOSED", closeAction)}
                                      className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
                                    >
                                      Close
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setCloseId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => {
                                    setCloseId(i.id);
                                    setCloseAction(i.correctiveAction || "");
                                  }}
                                  className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
                                >
                                  Close with verification
                                </Button>
                              )}
                            </>
                          )}
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
