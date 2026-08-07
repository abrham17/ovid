"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Banknote, Plus, Loader2 } from "lucide-react";

type WbsNode = { id: string; code: string; name: string };
type Contract = {
  id: string;
  scopeDescription: string;
  contractValue: number | string;
  contractorOrg?: { name: string; partyType: string } | null;
};

type BoqRow = {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  budgetedQuantity: number | string;
  unitRate: number | string;
  budgetedAmount: number;
  committedAmount: number;
  actualAmount: number;
  variance: number;
  wbsNode?: WbsNode | null;
};

type Measurement = {
  id: string;
  itemNo: string;
  quantity: number | string;
  unitRate: number | string;
  status: string;
  certificateNo?: string | null;
  locationFrom?: string | null;
  locationTo?: string | null;
  createdAt: string | Date;
  wbsNode?: WbsNode | null;
};

type Variation = {
  id: string;
  itemNo: string;
  workDescription: string;
  costImpact?: number | string | null;
  timeImpactDays?: number | null;
  status: string;
  createdAt: string | Date;
  wbsNode?: WbsNode | null;
};

type Props = {
  projectId: string;
  boqItems: BoqRow[];
  measurements: Measurement[];
  variations: Variation[];
  contracts: Contract[];
  totals: { budgeted: number; committed: number; actual: number };
  wbsNodes: WbsNode[];
  canCreateCost: boolean;
  canCreateMeasurement: boolean;
  canApproveMeasurement: boolean;
  canApproveCost: boolean;
  /** Hide unit rates / margin from non-contractor parties */
  showRates: boolean;
};

const IPC_NEXT: Record<string, string | null> = {
  DRAFT: "SUBMITTED",
  SUBMITTED: "CONSULTANT_QUERIED",
  CONSULTANT_QUERIED: "CERTIFIED",
  CERTIFIED: "PAID",
  PAID: null,
};

const VO_NEXT: Record<string, string | null> = {
  DRAFT: "CONTRACTOR_PREPARED",
  CONTRACTOR_PREPARED: "CONTRACTOR_CHECKED",
  CONTRACTOR_CHECKED: "CONSULTANT_CHECKED",
  CONSULTANT_CHECKED: "CONSULTANT_APPROVED",
  CONSULTANT_APPROVED: null,
  REJECTED: null,
};

export function CostView({
  projectId,
  boqItems,
  measurements,
  variations,
  contracts,
  totals,
  wbsNodes,
  canCreateCost,
  canCreateMeasurement,
  canApproveMeasurement,
  canApproveCost,
  showRates,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("boq");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBoq, setShowBoq] = useState(false);
  const [showMeas, setShowMeas] = useState(false);
  const [showVo, setShowVo] = useState(false);

  // BOQ form
  const [boqWbs, setBoqWbs] = useState(wbsNodes[0]?.id ?? "");
  const [itemCode, setItemCode] = useState("");
  const [boqDesc, setBoqDesc] = useState("");
  const [unit, setUnit] = useState("m3");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState("");

  // Measurement form
  const [mContract, setMContract] = useState(contracts[0]?.id ?? "");
  const [mWbs, setMWbs] = useState(wbsNodes[0]?.id ?? "");
  const [mItem, setMItem] = useState("");
  const [mQty, setMQty] = useState("");
  const [mRate, setMRate] = useState("");

  // VO form
  const [voWbs, setVoWbs] = useState("");
  const [voItem, setVoItem] = useState("");
  const [voDesc, setVoDesc] = useState("");
  const [voCost, setVoCost] = useState("");
  const [voDays, setVoDays] = useState("");

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/cost`, {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Cost & Commercial
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            BoQ measurements, IPC submissions, and payment certifications
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateCost && (
            <>
              <Button size="sm" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowBoq(true)}>
                <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> BOQ item
              </Button>
              <Button size="sm" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowVo(true)}>
                <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Variation
              </Button>
            </>
          )}
          {canCreateMeasurement && (
            <Button size="sm" onClick={() => setShowMeas(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs">
              <Plus className="h-4 w-4 mr-1" /> Measurement
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Budgeted</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">
              {showRates ? formatMoney(totals.budgeted) : "—"}
            </p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Committed</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">
              {showRates ? formatMoney(totals.committed) : "—"}
            </p>
           
</div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Actual</p>
 
            <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">
              {showRates ? formatMoney(totals.actual) : "—"}
            </p>
            {showRates && (
              <p
                className={`text-xs font-medium ${
                  totals.budgeted - totals.actual >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                Variance {formatMoney(totals.budgeted - totals.actual)}
              </p>
            )}
           
</div>
      </div>

      {showBoq && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <h3 className="font-serif text-xl font-bold text-[#2C2420]">New BOQ item</h3>
  <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "boq",
                  data: {
                    wbsNodeId: boqWbs,
                    itemCode,
                    description: boqDesc,
                    unit,
                    budgetedQuantity: Number(qty),
                    unitRate: Number(rate),
                  },
                });
                if (ok) {
                  setShowBoq(false);
                  setItemCode("");
                  setBoqDesc("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Code</Label>
                <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>WBS</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={boqWbs}
                  onChange={(e) => setBoqWbs(e.target.value)}
                >
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Input value={boqDesc} onChange={(e) => setBoqDesc(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Budgeted qty</Label>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Unit rate (ETB)</Label>
                <Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowBoq(false)}>
                  Cancel
                </Button>
              </div>
            </form>
</div>
      )}

      {showMeas && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <h3 className="font-serif text-xl font-bold text-[#2C2420]">New measurement (IPC line)</h3>
  <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "measurement",
                  data: {
                    contractId: mContract,
                    wbsNodeId: mWbs,
                    itemNo: mItem,
                    quantity: Number(mQty),
                    unitRate: Number(mRate),
                  },
                });
                if (ok) {
                  setShowMeas(false);
                  setMItem("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Contract</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={mContract}
                  onChange={(e) => setMContract(e.target.value)}
                  required
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractorOrg?.name ?? "Contract"} — {c.scopeDescription.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>WBS</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={mWbs}
                  onChange={(e) => setMWbs(e.target.value)}
                >
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Item no</Label>
                <Input value={mItem} onChange={(e) => setMItem(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" step="any" value={mQty} onChange={(e) => setMQty(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Unit rate</Label>
                <Input type="number" step="any" value={mRate} onChange={(e) => setMRate(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading || !contracts.length} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create draft"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowMeas(false)}>
                  Cancel
                </Button>
              </div>
              {!contracts.length && (
                <p className="sm:col-span-2 text-xs text-amber-700">
                  No contracts on this project yet — seed or create a contract first.
                </p>
              )}
            </form>
</div>
      )}

      {showVo && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
  <h3 className="font-serif text-xl font-bold text-[#2C2420]">Variation order (from Day Work)</h3>
  <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "variation",
                  data: {
                    wbsNodeId: voWbs || null,
                    itemNo: voItem,
                    workDescription: voDesc,
                    costImpact: voCost ? Number(voCost) : null,
                    timeImpactDays: voDays ? Number(voDays) : null,
                  },
                });
                if (ok) {
                  setShowVo(false);
                  setVoItem("");
                  setVoDesc("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Item no</Label>
                <Input value={voItem} onChange={(e) => setVoItem(e.target.value)} required  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>WBS (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                  value={voWbs}
                  onChange={(e) => setVoWbs(e.target.value)}
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
                <Label>Work description</Label>
                <Textarea value={voDesc} onChange={(e) => setVoDesc(e.target.value)} required rows={3}  className="bg-white border-[#D8D0C5]"/>
              </div>
              <div className="space-y-1">
                <Label>Cost impact (ETB)</Label>
                <Input type="number" step="any" value={voCost} onChange={(e) => setVoCost(e.target.value)}  className="bg-white border-[#D8D0C5]" />
              </div>
              <div className="space-y-1">
                <Label>Time impact (days)</Label>
                <Input type="number" value={voDays} onChange={(e) => setVoDays(e.target.value)}  className="bg-white border-[#D8D0C5]" />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create draft VO"}
                </Button>
                <Button type="button" variant="outline" className="border-[#D8D0C5] hover:bg-[#FAF7F2]" onClick={() => setShowVo(false)}>
                  Cancel
                </Button>
              </div>
            </form>
</div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="boq">BOQ ({boqItems.length})</TabsTrigger>
          <TabsTrigger value="ipc">IPC / Measurements ({measurements.length})</TabsTrigger>
          <TabsTrigger value="vo">Variations ({variations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="boq" className="mt-4">
          {boqItems.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No BOQ items"
              description="Load the bill of quantities against WBS nodes to track budget vs actual."
            />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="pb-3 px-3">Code</th>
                      <th className="pb-3 px-3">Description</th>
                      <th className="pb-3 px-3">WBS</th>
                      <th className="pb-3 px-3 text-right">Qty</th>
                      {showRates && <th className="pb-3 px-3 text-right">Rate</th>}
                      {showRates && <th className="pb-3 px-3 text-right">Budget</th>}
                      {showRates && <th className="pb-3 px-3 text-right">Actual</th>}
                      {showRates && <th className="pb-3 px-3 text-right">Variance</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8DE]">
                    {boqItems.map((r) => (
                      <tr key={r.id} className="hover:bg-[#FAF7F2]/60 border-b border-[#EFE8DE]">
                        <td className="py-3.5 px-3 font-mono text-xs">{r.itemCode}</td>
                        <td className="py-3.5 px-3">{r.description}</td>
                        <td className="py-3.5 px-3 font-mono text-xs">{r.wbsNode?.code}</td>
                        <td className="py-3.5 px-3 text-right tabular-nums">
                          {Number(r.budgetedQuantity).toLocaleString()} {r.unit}
                        </td>
                        {showRates && (
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMoney(Number(r.unitRate))}
                          </td>
                        )}
                        {showRates && (
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMoney(r.budgetedAmount)}
                          </td>
                        )}
                        {showRates && (
                          <td className="py-3.5 px-3 text-right tabular-nums">
                            {formatMoney(r.actualAmount)}
                          </td>
                        )}
                        {showRates && (
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-medium ${
                              r.variance >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {formatMoney(r.variance)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
</div>
          )}
        </TabsContent>

        <TabsContent value="ipc" className="mt-4 space-y-3">
          {measurements.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No measurements"
              description="IPC lines move DRAFT → SUBMITTED → CERTIFIED → PAID."
            />
          ) : (
            measurements.map((m) => {
              const next = IPC_NEXT[m.status];
              const amount = Number(m.quantity) * Number(m.unitRate);
              return (
                <div key={m.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs">
                  <div className="p-6 flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{m.itemNo}</span>
                        <StatusBadge status={m.status} />
                        <span className="text-xs text-stone-400">{formatDate(m.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-700">
                        Qty {Number(m.quantity).toLocaleString()}
                        {showRates ? ` · ${formatMoney(amount)}` : ""}
                        {m.wbsNode ? ` · ${m.wbsNode.code}` : ""}
                      </p>
                    </div>
                    {next &&
                      (next === "CERTIFIED" || next === "PAID"
                        ? canApproveMeasurement
                        : canCreateMeasurement) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() =>
                            post({
                              kind: "measurement_status",
                              measurementId: m.id,
                              status: next,
                            })
                          }
                        >
                          → {titleCase(next)}
                        </Button>
                      )}
                  </div>
</div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="vo" className="mt-4 space-y-3">
          {variations.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No variation orders"
              description="Day-work style VOs follow the contractor → consultant approval chain."
            />
          ) : (
            variations.map((v) => {
              const next = VO_NEXT[v.status];
              return (
                <div key={v.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs">
                  <div className="p-6 flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{v.itemNo}</span>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="mt-1 text-sm text-stone-800">{v.workDescription}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {showRates && v.costImpact != null
                          ? `Cost impact ${formatMoney(Number(v.costImpact))}`
                          : ""}
                        {v.timeImpactDays != null ? ` · +${v.timeImpactDays} days` : ""}
                        {v.wbsNode ? ` · ${v.wbsNode.code}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {next &&
                        (next === "CONSULTANT_APPROVED"
                          ? canApproveCost
                          : canCreateCost) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() =>
                              post({
                                kind: "variation_status",
                                variationId: v.id,
                                status: next,
                              })
                            }
                          >
                            → {titleCase(next)}
                          </Button>
                        )}
                      {v.status === "CONSULTANT_CHECKED" && canApproveCost && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() =>
                            post({
                              kind: "variation_status",
                              variationId: v.id,
                              status: "REJECTED",
                            })
                          }
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
</div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
