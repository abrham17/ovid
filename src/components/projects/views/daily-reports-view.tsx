"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  ClipboardList,
  Plus,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";

type WbsNode = { id: string; code: string; name: string };
type CreatedBy = { id: string; name: string };

type EarthworkEntry = {
  id: string;
  date: string | Date;
  station?: string | null;
  activityDescription: string;
  equipmentType?: string | null;
  equipmentPlateNo?: string | null;
  operatingHours?: number | string | null;
  idleHours?: number | string | null;
  downHours?: number | string | null;
  quantityLength?: number | string | null;
  quantityWidth?: number | string | null;
  quantityDepth?: number | string | null;
  remark?: string | null;
  status: string;
  wbsNode?: WbsNode | null;
  createdBy?: CreatedBy | null;
};

type StructureEntry = {
  id: string;
  date: string | Date;
  activityDescription: string;
  designQuantity?: number | string | null;
  actualQuantity?: number | string | null;
  concreteGrade?: string | null;
  materialUsed?: string | null;
  operatingHours?: number | string | null;
  remark?: string | null;
  status: string;
  wbsNode?: WbsNode | null;
  createdBy?: CreatedBy | null;
};

type RebarEntry = {
  id: string;
  date: string | Date;
  barDesignation: string;
  diameterMm: number;
  numberOfBars: number;
  lengthM: number | string;
  numberOfFaces: number;
  computedWeightKg?: number | string | null;
  shape?: string | null;
  remark?: string | null;
  status: string;
  wbsNode?: WbsNode | null;
  createdBy?: CreatedBy | null;
};

type Props = {
  projectId: string;
  earthwork: EarthworkEntry[];
  structure: StructureEntry[];
  rebar: RebarEntry[];
  canCreate: boolean;
  canApprove?: boolean;
  wbsNodes?: WbsNode[];
  scopeBanner?: string | null;
  scopeEmptyTitle?: string | null;
  scopeEmptyDescription?: string | null;
};

function num(v: number | string | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function DailyReportsView({
  projectId,
  earthwork,
  structure,
  rebar,
  canCreate,
  canApprove = false,
  wbsNodes = [],
  scopeBanner,
  scopeEmptyTitle,
  scopeEmptyDescription,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("structure");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"earthwork" | "structure" | "rebar">("structure");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [wbsNodeId, setWbsNodeId] = useState(wbsNodes[0]?.id ?? "");
  const [activityDescription, setActivityDescription] = useState("");
  const [station, setStation] = useState("");
  const [designQty, setDesignQty] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [concreteGrade, setConcreteGrade] = useState("C-25");
  const [barDesignation, setBarDesignation] = useState("");
  const [diameterMm, setDiameterMm] = useState("12");
  const [numberOfBars, setNumberOfBars] = useState("");
  const [lengthM, setLengthM] = useState("");
  const [numberOfFaces, setNumberOfFaces] = useState("1");
  const [qtyL, setQtyL] = useState("");
  const [qtyW, setQtyW] = useState("");
  const [qtyD, setQtyD] = useState("");
  const [oh, setOh] = useState("");
  const [ih, setIh] = useState("");
  const [dh, setDh] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [remark, setRemark] = useState("");

  function resetForm() {
    setActivityDescription("");
    setStation("");
    setDesignQty("");
    setActualQty("");
    setBarDesignation("");
    setNumberOfBars("");
    setLengthM("");
    setQtyL("");
    setQtyW("");
    setQtyD("");
    setOh("");
    setIh("");
    setDh("");
    setEquipmentType("");
    setEquipmentId("");
    setRemark("");
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let body: Record<string, unknown>;

      if (formType === "structure") {
        body = {
          type: "structure",
          data: {
            wbsNodeId,
            date,
            activityDescription,
            designQuantity: designQty ? Number(designQty) : null,
            actualQuantity: actualQty ? Number(actualQty) : null,
            concreteGrade: concreteGrade || null,
            equipmentType: equipmentType || null,
            equipmentSerialNo: equipmentId || null,
            operatingHours: oh ? Number(oh) : null,
            idleHours: ih ? Number(ih) : null,
            downHours: dh ? Number(dh) : null,
            remark: remark || null,
          },
        };
      } else if (formType === "earthwork") {
        body = {
          type: "earthwork",
          data: {
            wbsNodeId,
            date,
            station: station || null,
            activityDescription,
            equipmentType: equipmentType || null,
            equipmentPlateNo: equipmentId || null,
            operatingHours: oh ? Number(oh) : null,
            idleHours: ih ? Number(ih) : null,
            downHours: dh ? Number(dh) : null,
            quantityLength: qtyL ? Number(qtyL) : null,
            quantityWidth: qtyW ? Number(qtyW) : null,
            quantityDepth: qtyD ? Number(qtyD) : null,
            remark: remark || null,
          },
        };
      } else {
        body = {
          type: "rebar",
          data: {
            wbsNodeId,
            date,
            barDesignation,
            diameterMm: Number(diameterMm),
            numberOfBars: Number(numberOfBars),
            lengthM: Number(lengthM),
            numberOfFaces: Number(numberOfFaces) || 1,
            remark: remark || null,
          },
        };
      }

      const res = await fetch(`/api/projects/${projectId}/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to create entry");
        return;
      }
      setShowForm(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    action: "submit" | "approve",
    type: "earthwork" | "structure" | "rebar",
    entryId: string
  ) {
    setActionLoading(entryId);
    try {
      const res = await fetch(`/api/projects/${projectId}/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type, entryId }),
      });
      const json = await res.json();
      if (json.success) router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <ScopeBanner message={scopeBanner} />

      {scopeEmptyTitle && earthwork.length + structure.length + rebar.length === 0 ? (
        <ScopeEmptyState
          show
          title={scopeEmptyTitle}
          description={scopeEmptyDescription}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Daily Site Reports
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Structure, rebar and earthwork progress — Ovid Construction field entry
          </p>
        </div>
        {canCreate && (
          <Button
            size="sm"
            className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs font-medium"
            onClick={() => {
              setShowForm(true);
              setFormType(tab === "earthwork" ? "earthwork" : tab === "rebar" ? "rebar" : "structure");
            }}
          >
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#2C2420]">
              New {formType === "structure" ? "Structure" : formType === "earthwork" ? "Earthwork" : "Rebar"}{" "}
                Daily Report
            </h3>
              <div className="flex gap-2">
                {(["structure", "rebar", "earthwork"] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={formType === t ? "default" : "outline"}
                    onClick={() => setFormType(t)}
                  >
                    {t === "structure" ? "Structure" : t === "rebar" ? "Rebar" : "Earthwork"}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>WBS Node</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                  value={wbsNodeId}
                  onChange={(e) => setWbsNodeId(e.target.value)}
                  required
                >
                  <option value="">Select WBS…</option>
                  {wbsNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} — {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {(formType === "structure" || formType === "earthwork") && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Activity description</Label>
                  <Input
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder={
                      formType === "structure"
                        ? "e.g. Shear wall S3 – Ground Floor pour"
                        : "e.g. Bulk excavation foundation Block A"
                    }
                    required
                  />
                </div>
              )}

              {formType === "structure" && (
                <>
                  <div className="space-y-2">
                    <Label>Design quantity (m³ / m²)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={designQty}
                      onChange={(e) => setDesignQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Actual quantity</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={actualQty}
                      onChange={(e) => setActualQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Concrete grade</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                      value={concreteGrade}
                      onChange={(e) => setConcreteGrade(e.target.value)}
                    >
                      {["C-15", "C-20", "C-25", "C-30", "C-35", "C-40", "OTHER"].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formType === "earthwork" && (
                <>
                  <div className="space-y-2">
                    <Label>Station / chainage</Label>
                    <Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="e.g. 0+050–0+100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Length (m)</Label>
                    <Input type="number" step="0.01" value={qtyL} onChange={(e) => setQtyL(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Width (m)</Label>
                    <Input type="number" step="0.01" value={qtyW} onChange={(e) => setQtyW(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Depth (m)</Label>
                    <Input type="number" step="0.01" value={qtyD} onChange={(e) => setQtyD(e.target.value)} />
                  </div>
                </>
              )}

              {formType === "rebar" && (
                <>
                  <div className="space-y-2">
                    <Label>Bar designation</Label>
                    <Input
                      value={barDesignation}
                      onChange={(e) => setBarDesignation(e.target.value)}
                      placeholder="e.g. S1, H1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Diameter (mm)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                      value={diameterMm}
                      onChange={(e) => setDiameterMm(e.target.value)}
                    >
                      {[8, 10, 12, 14, 16, 18, 20, 22, 24].map((d) => (
                        <option key={d} value={d}>
                          {d} mm
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of bars</Label>
                    <Input
                      type="number"
                      value={numberOfBars}
                      onChange={(e) => setNumberOfBars(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Length (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={lengthM}
                      onChange={(e) => setLengthM(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of faces</Label>
                    <Input
                      type="number"
                      value={numberOfFaces}
                      onChange={(e) => setNumberOfFaces(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(formType === "structure" || formType === "earthwork") && (
                <>
                  <div className="space-y-2">
                    <Label>Equipment type</Label>
                    <Input
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      placeholder="e.g. Excavator, Mixer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plate / Serial No.</Label>
                    <Input value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>OH (operating hrs)</Label>
                    <Input type="number" step="0.1" value={oh} onChange={(e) => setOh(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IH (idle hrs)</Label>
                    <Input type="number" step="0.1" value={ih} onChange={(e) => setIh(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>DH (down hrs)</Label>
                    <Input type="number" step="0.1" value={dh} onChange={(e) => setDh(e.target.value)} />
                  </div>
                </>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Remark</Label>
                <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
              </div>

              {error && (
                <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>
              )}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as draft"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="structure">Structure ({structure.length})</TabsTrigger>
          <TabsTrigger value="rebar">Rebar ({rebar.length})</TabsTrigger>
          <TabsTrigger value="earthwork">Earthwork ({earthwork.length})</TabsTrigger>
        </TabsList>

        {/* Structure */}
        <TabsContent value="structure" className="mt-4">
          {structure.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No structure entries"
              description="Log concrete pours, formwork and structural progress for Ovid housing/building blocks."
            />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">WBS</th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3 text-right">Design</th>
                      <th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">By</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {structure.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{e.wbsNode?.code ?? "—"}</td>
                        <td className="max-w-[200px] truncate px-4 py-3">{e.activityDescription}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{num(e.designQuantity)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{num(e.actualQuantity)}</td>
                        <td className="px-4 py-3">{e.concreteGrade ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">{e.createdBy?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {e.status === "DRAFT" && canCreate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("submit", "structure", e.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {e.status === "SUBMITTED" && canApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("approve", "structure", e.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>

        {/* Rebar */}
        <TabsContent value="rebar" className="mt-4">
          {rebar.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No rebar entries"
              description="Track bar designation, diameter and weight — weight is auto-computed."
            />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">WBS</th>
                      <th className="px-4 py-3">Bar</th>
                      <th className="px-4 py-3 text-right">Ø mm</th>
                      <th className="px-4 py-3 text-right">Bars</th>
                      <th className="px-4 py-3 text-right">Length m</th>
                      <th className="px-4 py-3 text-right">Weight kg</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebar.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{e.wbsNode?.code ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">{e.barDesignation}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{e.diameterMm}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {e.numberOfBars}×{e.numberOfFaces}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{num(e.lengthM)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {num(e.computedWeightKg)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-3">
                          {e.status === "DRAFT" && canCreate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("submit", "rebar", e.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {e.status === "SUBMITTED" && canApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("approve", "rebar", e.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>

        {/* Earthwork */}
        <TabsContent value="earthwork" className="mt-4">
          {earthwork.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No earthwork entries"
              description="Record excavation, fill and equipment hours for foundations and site works."
            />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">WBS</th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3">Station</th>
                      <th className="px-4 py-3 text-right">L×W×D</th>
                      <th className="px-4 py-3 text-right">OH/IH/DH</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {earthwork.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(e.date)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{e.wbsNode?.code ?? "—"}</td>
                        <td className="max-w-[180px] truncate px-4 py-3">{e.activityDescription}</td>
                        <td className="px-4 py-3 text-xs">{e.station ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          {num(e.quantityLength)}×{num(e.quantityWidth)}×{num(e.quantityDepth)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          {num(e.operatingHours)}/{num(e.idleHours)}/{num(e.downHours)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-3">
                          {e.status === "DRAFT" && canCreate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("submit", "earthwork", e.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {e.status === "SUBMITTED" && canApprove && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoading === e.id}
                              onClick={() => handleAction("approve", "earthwork", e.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
