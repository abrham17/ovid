"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { AlertOctagon, Plus, Loader2 } from "lucide-react";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";

type WbsNode = { id: string; code: string; name: string };
type UserOpt = { id: string; fullName: string; role?: string };

type Risk = {
  id: string;
  category: string;
  description: string;
  likelihood: number;
  impact: number;
  score: number;
  band: string;
  status: string;
  mitigationPlan?: string | null;
  wbsNode?: WbsNode | null;
  owner?: UserOpt | null;
  realizedAsStoppage?: { id: string; stoppageType: string; reason: string } | null;
  realizedAsVariation?: { id: string; itemNo: string } | null;
};

type Props = {
  projectId: string;
  risks: Risk[];
  wbsNodes: WbsNode[];
  owners: UserOpt[];
  canCreate: boolean;
  canUpdate: boolean;
  scopeBanner?: string | null;
  scopeEmptyTitle?: string | null;
  scopeEmptyDescription?: string | null;
};

const CATEGORIES = [
  "DESIGN",
  "PROCUREMENT",
  "WEATHER",
  "FX_IMPORT",
  "GEOTECHNICAL",
  "REGULATORY",
  "LABOR",
  "SECURITY_THEFT",
  "FINANCIAL",
  "OTHER",
] as const;

function bandClass(band: string) {
  switch (band) {
    case "CRITICAL":
    case "HIGH":
      return "bg-[#FDE8E2] text-[#C04928]";
    case "LOW":
      return "bg-[#E3F2E6] text-[#2E7D32]";
    default:
      return "bg-[#F2ECE1] text-stone-800";
  }
}


export function RiskView({
  projectId,
  risks,
  wbsNodes,
  owners,
  canCreate,
  canUpdate,
  scopeBanner,
  scopeEmptyTitle,
  scopeEmptyDescription,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("DESIGN");
  const [description, setDescription] = useState("");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [wbsId, setWbsId] = useState("");
  const [mitigation, setMitigation] = useState("");

  const open = risks.filter((r) => r.status === "OPEN" || r.status === "MITIGATING");
  const critical = risks.filter((r) => r.band === "CRITICAL" || r.band === "HIGH");

  async function createRisk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "create",
          data: {
            category,
            description,
            likelihood,
            impact,
            ownerId,
            wbsNodeId: wbsId || null,
            mitigationPlan: mitigation || null,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return;
      }
      setShowForm(false);
      setDescription("");
      setMitigation("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(riskId: string, status: string) {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "update",
          riskId,
          data: { status },
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function realize(riskId: string) {
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "realize", riskId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <ScopeBanner message={scopeBanner} />
      {scopeEmptyTitle && risks.length === 0 ? (
        <ScopeEmptyState show title={scopeEmptyTitle} description={scopeEmptyDescription} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Risk Register
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Identified risks, probability/impact assessment, and mitigation tracking
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs font-medium">
            <Plus className="h-4 w-4 mr-1" />
            Add risk
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total risks</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{risks.length}</p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Open / mitigating</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{open.length}</p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">High / critical</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{critical.length}</p>
           
</div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <h3 className="font-serif text-xl font-bold text-[#2C2420]">New risk entry</h3>
  <form onSubmit={createRisk} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {titleCase(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Owner</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  required
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Likelihood (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={likelihood}
                  onChange={(e) => setLikelihood(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label>Impact (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={impact}
                  onChange={(e) => setImpact(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>
                  Score preview:{" "}
                  <span className="font-bold">{likelihood * impact}</span>
                </Label>
              </div>
              <div className="space-y-1">
                <Label>WBS (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={wbsId}
                  onChange={(e) => setWbsId(e.target.value)}
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
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={2}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Mitigation plan</Label>
                <Textarea
                  value={mitigation}
                  onChange={(e) => setMitigation(e.target.value)}
                  rows={2}
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading || !owners.length} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
</div>
      )}

      {risks.length === 0 ? (
        <EmptyState
          icon={AlertOctagon}
          title="Risk register empty"
          description="Capture design, FX/import, weather, and other risks early — link realized risks to stoppages or VOs."
        />
      ) : (
        <div className="space-y-3">
          {risks.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs">
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${bandClass(r.band)}`}
                      >
                        {r.band} · {r.score}
                      </span>
                      <StatusBadge status={r.status} />
                      <StatusBadge status={r.category} />
                      {r.wbsNode && (
                        <span className="font-mono text-xs text-emerald-700">{r.wbsNode.code}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-stone-900">{r.description}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      L{r.likelihood} × I{r.impact} · Owner {r.owner?.fullName ?? "—"}
                    </p>
                    {r.mitigationPlan && (
                      <p className="mt-1 text-xs text-stone-600">
                        <span className="font-semibold">Mitigation: </span>
                        {r.mitigationPlan}
                      </p>
                    )}
                    {r.realizedAsStoppage && (
                      <p className="mt-1 text-xs text-red-700">
                        Realized as stoppage: {r.realizedAsStoppage.reason}
                      </p>
                    )}
                    {r.realizedAsVariation && (
                      <p className="mt-1 text-xs text-red-700">
                        Realized as VO {r.realizedAsVariation.itemNo}
                      </p>
                    )}
                  </div>
                  {canUpdate && r.status !== "CLOSED" && r.status !== "REALIZED" && (
                    <div className="flex flex-col gap-1">
                      {r.status === "OPEN" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => setStatus(r.id, "MITIGATING")} className="border-[#D8D0C5] hover:bg-[#FAF7F2]"
                        >
                          Start mitigating
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => setStatus(r.id, "CLOSED")} className="border-[#D8D0C5] hover:bg-[#FAF7F2]"
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => realize(r.id)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]"
                      >
                        Mark realized
                      </Button>
                    </div>
                  )}
                </div>
              </div>
</div>
          ))}
        </div>
      )}
    </div>
  );
}
