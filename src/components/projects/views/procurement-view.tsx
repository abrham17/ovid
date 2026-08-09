"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatMoney } from "@/lib/utils";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Package, Plus, Loader2 } from "lucide-react";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";

type Props = {
  projectId: string;
  purchaseOrders: any[];
  bids: any[];
  materials: any[];
  receipts: any[];
  suppliers: any[];
  canCreate: boolean;
  canApprove: boolean;
  scopeBanner?: string | null;
  scopeEmptyTitle?: string | null;
  scopeEmptyDescription?: string | null;
};

const PO_NEXT: Record<string, string | null> = {
  DRAFT: "APPROVED",
  APPROVED: "ISSUED",
  ISSUED: "PARTIAL_RECEIVED",
  PARTIAL_RECEIVED: "RECEIVED",
  RECEIVED: "CLOSED",
  CLOSED: null,
  CANCELLED: null,
};

export function ProcurementView({
  projectId,
  purchaseOrders,
  bids,
  materials,
  receipts,
  suppliers,
  canCreate,
  canApprove,
  scopeBanner,
  scopeEmptyTitle,
  scopeEmptyDescription,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("pos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPO, setShowPO] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [showMat, setShowMat] = useState(false);

  const [poNo, setPoNo] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [matId, setMatId] = useState(materials[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");
  const [bidNo, setBidNo] = useState("");
  const [bidTitle, setBidTitle] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState("kg");

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/procurement`, {
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

  const openPOs = purchaseOrders.filter(
    (p) => !["CLOSED", "CANCELLED", "RECEIVED"].includes(p.status)
  ).length;

  return (
    <div className="space-y-8">
      <ScopeBanner message={scopeBanner} />
      {scopeEmptyTitle &&
      purchaseOrders.length + bids.length + materials.length === 0 ? (
        <ScopeEmptyState show title={scopeEmptyTitle} description={scopeEmptyDescription} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Procurement
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Purchase orders, bids/tenders, materials and receipts — Ovid
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowMat(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
              <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Material
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowBid(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
              <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Bid
            </Button>
            <Button size="sm" onClick={() => setShowPO(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs font-medium">
              <Plus className="h-4 w-4 mr-1" /> Purchase order
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Open POs</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{openPOs}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bids</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{bids.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Materials</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{materials.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Receipts</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{receipts.length}</p>
        </div>
      </div>

      {showMat && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">New material item</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "material",
                    data: { name: matName, unit: matUnit },
                  })
                ) {
                  setShowMat(false);
                  setMatName("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={matName} onChange={(e) => setMatName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Unit</Label>
                <Input value={matUnit} onChange={(e) => setMatUnit(e.target.value)} required />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowMat(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showPO && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">New purchase order</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "po",
                    data: {
                      supplierOrgId: supplierId,
                      poNo,
                      items: matId
                        ? [
                            {
                              materialItemId: matId,
                              quantityOrdered: Number(qty),
                              unitPrice: Number(price),
                            },
                          ]
                        : [],
                      amount: Number(qty) * Number(price),
                    },
                  })
                ) {
                  setShowPO(false);
                  setPoNo("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>PO number</Label>
                <Input value={poNo} onChange={(e) => setPoNo(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Material line</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={matId}
                  onChange={(e) => setMatId(e.target.value)}
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unit price (ETB)</Label>
                <Input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              {!suppliers.length && (
                <p className="sm:col-span-2 text-xs text-amber-700">
                  No supplier organizations seeded yet.
                </p>
              )}
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading || !suppliers.length} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create draft PO"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPO(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showBid && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Register bid / tender</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "bid",
                    data: {
                      bidNo,
                      title: bidTitle,
                      supplierOrgId: supplierId || null,
                      amount: bidAmount ? Number(bidAmount) : null,
                    },
                  })
                ) {
                  setShowBid(false);
                  setBidNo("");
                  setBidTitle("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Bid no</Label>
                <Input value={bidNo} onChange={(e) => setBidNo(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Supplier (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">—</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Title</Label>
                <Input value={bidTitle} onChange={(e) => setBidTitle(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Amount (ETB)</Label>
                <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowBid(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pos">POs ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="bids">Bids ({bids.length})</TabsTrigger>
          <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
          <TabsTrigger value="receipts">Receipts ({receipts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-4 space-y-2">
          {purchaseOrders.length === 0 ? (
            <EmptyState icon={Package} title="No purchase orders" description="Create POs against supplier organizations." />
          ) : (
            purchaseOrders.map((po) => {
              const next = PO_NEXT[po.status];
              return (
                <div key={po.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{po.poNo}</span>
                        <StatusBadge status={po.status} />
                      </div>
                      <p className="mt-1 text-sm text-stone-700">
                        {po.supplier?.name}
                        {po.amount != null ? ` · ${formatMoney(Number(po.amount))}` : ""}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatDate(po.issueDate)} · {po.items?.length ?? 0} line(s) ·{" "}
                        {po._count?.receipts ?? 0} receipt(s)
                      </p>
                    </div>
                    {next &&
                      ((["APPROVED", "ISSUED"].includes(next) && canApprove) ||
                        (!["APPROVED", "ISSUED"].includes(next) && canCreate)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() =>
                            post({ kind: "po_status", poId: po.id, status: next })
                          }
                        >
                          → {titleCase(next)}
                        </Button>
                      )}
                  </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="bids" className="mt-4 space-y-2">
          {bids.length === 0 ? (
            <EmptyState icon={Package} title="No bids" description="Track tender submissions and win/loss outcomes." />
          ) : (
            bids.map((b) => (
              <div key={b.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{b.bidNo}</span>
                      <StatusBadge status={b.result} />
                    </div>
                    <p className="mt-1 text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-stone-500">
                      {b.supplier?.name ?? "No supplier"}
                      {b.amount != null ? ` · ${formatMoney(Number(b.amount))}` : ""}
                    </p>
                  </div>
                  {b.result === "DRAFT" && canCreate && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() =>
                        post({ kind: "bid_status", bidId: b.id, result: "SUBMITTED" })
                      }
                    >
                      Submit
                    </Button>
                  )}
                  {b.result === "SUBMITTED" && canApprove && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => post({ kind: "bid_status", bidId: b.id, result: "WON" })}
                      >
                        Won
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => post({ kind: "bid_status", bidId: b.id, result: "LOST" })}
                      >
                        Lost
                      </Button>
                    </div>
                  )}
                </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          {materials.length === 0 ? (
            <EmptyState icon={Package} title="No materials" description="Catalogue items for PO lines and receipts." />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Import dependent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="px-4 py-3 font-medium">{m.name}</td>
                        <td className="px-4 py-3">{m.unit}</td>
                        <td className="px-4 py-3">{m.importDependent ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="mt-4 space-y-2">
          {receipts.length === 0 ? (
            <EmptyState icon={Package} title="No receipts" description="Goods received against POs will appear here." />
          ) : (
            receipts.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap justify-between gap-2 p-4 text-sm">
                  <div>
                    <p className="font-medium">{r.materialItem?.name}</p>
                    <p className="text-xs text-stone-500">
                      Qty {Number(r.quantityReceived)} {r.materialItem?.unit} ·{" "}
                      {r.receivedBy?.fullName}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">{formatDate(r.receiptDate)}</span>
                </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
