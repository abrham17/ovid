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
import { ShieldCheck, Plus, Loader2 } from "lucide-react";

type WbsNode = { id: string; code: string; name: string };

type Props = {
  projectId: string;
  itrs: any[];
  defects: any[];
  punches: any[];
  wbsNodes: WbsNode[];
  canCreate: boolean;
  canUpdate: boolean;
  canApprove: boolean;
};

export function QualityView({
  projectId,
  itrs,
  defects,
  punches,
  wbsNodes,
  canCreate,
  canUpdate,
  canApprove,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("itrs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showItr, setShowItr] = useState(false);
  const [showDef, setShowDef] = useState(false);
  const [showPunch, setShowPunch] = useState(false);

  const [wbsId, setWbsId] = useState(wbsNodes[0]?.id ?? "");
  const [inspectionType, setInspectionType] = useState("");
  const [result, setResult] = useState("PASS");
  const [inspectedAt, setInspectedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [defDesc, setDefDesc] = useState("");
  const [defItr, setDefItr] = useState("");
  const [punchDesc, setPunchDesc] = useState("");
  const [punchSev, setPunchSev] = useState("MINOR");
  const [patternTag, setPatternTag] = useState("");

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/quality`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  const openDefects = defects.filter((d) => d.status !== "VERIFIED_CLOSED").length;
  const openPunches = punches.filter((p) => p.status !== "VERIFIED").length;
  const fails = itrs.filter((i) => i.result === "FAIL").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Quality Control
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            ITRs, defect rework closeout, and punch lists — Ovid site quality
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowItr(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
              <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> ITR
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDef(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
              <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Defect
            </Button>
            <Button size="sm" onClick={() => setShowPunch(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs">
              <Plus className="h-4 w-4 mr-1" /> Punch
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">ITRs</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{itrs.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Failed ITRs</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{fails}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Open defects</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{openDefects}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Open punches</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{openPunches}</p>
        </div>
      </div>

      {showItr && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Inspection & Test Record</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "itr",
                  data: { wbsNodeId: wbsId, inspectionType, result, inspectedAt },
                });
                if (ok) {
                  setShowItr(false);
                  setInspectionType("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>WBS</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={wbsId}
                  onChange={(e) => setWbsId(e.target.value)}
                >
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Result</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                >
                  {["PASS", "FAIL", "CONDITIONAL_PASS"].map((r) => (
                    <option key={r} value={r}>
                      {titleCase(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Inspection type</Label>
                <Input
                  value={inspectionType}
                  onChange={(e) => setInspectionType(e.target.value)}
                  placeholder="e.g. Concrete cube test, Rebar cover"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Inspected at</Label>
                <Input
                  type="datetime-local"
                  value={inspectedAt}
                  onChange={(e) => setInspectedAt(e.target.value)}
                  required
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save ITR"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowItr(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showDef && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Defect / non-conformance</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "defect",
                  data: {
                    wbsNodeId: wbsId,
                    description: defDesc,
                    linkedItrId: defItr || null,
                  },
                });
                if (ok) {
                  setShowDef(false);
                  setDefDesc("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>WBS</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={wbsId}
                  onChange={(e) => setWbsId(e.target.value)}
                >
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Linked ITR (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={defItr}
                  onChange={(e) => setDefItr(e.target.value)}
                >
                  <option value="">—</option>
                  {itrs.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.inspectionType} · {i.result}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={defDesc} onChange={(e) => setDefDesc(e.target.value)} required rows={3} />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log defect"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDef(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showPunch && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Punch list item</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "punch",
                  data: {
                    wbsNodeId: wbsId,
                    description: punchDesc,
                    severity: punchSev,
                    patternTag: patternTag || null,
                  },
                });
                if (ok) {
                  setShowPunch(false);
                  setPunchDesc("");
                  setPatternTag("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>WBS</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={wbsId}
                  onChange={(e) => setWbsId(e.target.value)}
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
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={punchSev}
                  onChange={(e) => setPunchSev(e.target.value)}
                >
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Input value={punchDesc} onChange={(e) => setPunchDesc(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Pattern tag (optional)</Label>
                <Input
                  value={patternTag}
                  onChange={(e) => setPatternTag(e.target.value)}
                  placeholder="e.g. finish-paint"
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add punch"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPunch(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="itrs">ITRs ({itrs.length})</TabsTrigger>
          <TabsTrigger value="defects">Defects ({defects.length})</TabsTrigger>
          <TabsTrigger value="punches">Punches ({punches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="itrs" className="mt-4 space-y-2">
          {itrs.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No ITRs" description="Record inspection & test results against WBS." />
          ) : (
            itrs.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={r.result} />
                      <span className="font-medium text-sm">{r.inspectionType}</span>
                      <span className="font-mono text-xs text-emerald-700">{r.wbsNode?.code}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {formatDateTime(r.inspectedAt)} · {r.inspectedBy?.fullName}
                      {(r._count?.defects ?? 0) > 0 ? ` · ${r._count.defects} defect(s)` : ""}
                    </p>
                  </div>
        </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="defects" className="mt-4 space-y-2">
          {defects.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No defects" description="Non-conformances move OPEN → REWORK → VERIFIED_CLOSED." />
          ) : (
            defects.map((d) => (
              <div key={d.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-start justify-between gap-2 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span className="font-mono text-xs text-emerald-700">{d.wbsNode?.code}</span>
                    </div>
                    <p className="mt-1 text-sm">{d.description}</p>
                    {d.linkedItr && (
                      <p className="text-xs text-stone-500">From ITR: {d.linkedItr.inspectionType}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {d.status === "OPEN" && canUpdate && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() =>
                          post({ kind: "defect_status", defectId: d.id, status: "REWORK_IN_PROGRESS" })
                        }
                      >
                        Start rework
                      </Button>
                    )}
                    {d.status !== "VERIFIED_CLOSED" && canApprove && (
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() =>
                          post({ kind: "defect_status", defectId: d.id, status: "VERIFIED_CLOSED" })
                        }
                      >
                        Verify closed
                      </Button>
                    )}
                  </div>
        </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="punches" className="mt-4 space-y-2">
          {punches.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No punch items" description="Track snags to RESOLVED then VERIFIED." />
          ) : (
            punches.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-start justify-between gap-2 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={p.status} />
                      <StatusBadge status={p.severity} />
                      {p.patternTag && (
                        <span className="text-[10px] rounded bg-[#F2ECE1] px-1.5 py-0.5">{p.patternTag}</span>
                      )}
                      <span className="font-mono text-xs text-emerald-700">{p.wbsNode?.code}</span>
                    </div>
                    <p className="mt-1 text-sm">{p.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.status === "OPEN" && canUpdate && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() =>
                          post({ kind: "punch_status", punchId: p.id, status: "RESOLVED" })
                        }
                      >
                        Resolve
                      </Button>
                    )}
                    {p.status === "RESOLVED" && canApprove && (
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() =>
                          post({ kind: "punch_status", punchId: p.id, status: "VERIFIED" })
                        }
                      >
                        Verify
                      </Button>
                    )}
                  </div>
        </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
