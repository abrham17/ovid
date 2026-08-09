"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Users, Plus, Loader2, Truck } from "lucide-react";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";

type WbsNode = { id: string; code: string; name: string };

type Props = {
  projectId: string;
  employees: any[];
  assignments: any[];
  equipment: any[];
  usageLogs: any[];
  utilizationPct: number;
  hours: { oh: number; ih: number; dh: number };
  wbsNodes: WbsNode[];
  canLabor: boolean;
  canEquipment: boolean;
  scopeBanner?: string | null;
  scopeEmptyTitle?: string | null;
  scopeEmptyDescription?: string | null;
};

export function ResourcesView({
  projectId,
  employees,
  assignments,
  equipment,
  usageLogs,
  utilizationPct,
  hours,
  wbsNodes,
  canLabor,
  canEquipment,
  scopeBanner,
  scopeEmptyTitle,
  scopeEmptyDescription,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("labor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmp, setShowEmp] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  const [fullName, setFullName] = useState("");
  const [profession, setProfession] = useState("");
  const [empType, setEmpType] = useState("PERMANENT");
  const [empId, setEmpId] = useState(employees[0]?.id ?? "");
  const [wbsId, setWbsId] = useState(wbsNodes[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hoursOnTask, setHoursOnTask] = useState("8");
  const [eqType, setEqType] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [eqId, setEqId] = useState(equipment[0]?.id ?? "");
  const [oh, setOh] = useState("6");
  const [ih, setIh] = useState("1");
  const [dh, setDh] = useState("0");

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/resources`, {
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
      <ScopeBanner message={scopeBanner} />
      {scopeEmptyTitle && assignments.length + usageLogs.length === 0 ? (
        <ScopeEmptyState show title={scopeEmptyTitle} description={scopeEmptyDescription} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Labor & Equipment
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Crew assignments and OH/IH/DH utilization — Ovid resources
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canLabor && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowEmp(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
                <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Employee
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAssign(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
                <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Assignment
              </Button>
            </>
          )}
          {canEquipment && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowEq(true)} className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]">
                <Plus className="h-4 w-4 mr-1 text-[#C04928]" /> Equipment
              </Button>
              <Button size="sm" onClick={() => setShowUsage(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs font-medium">
                <Plus className="h-4 w-4 mr-1" /> Usage log
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Employees</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{employees.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Equipment units</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{equipment.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Fleet utilization</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{utilizationPct.toFixed(0)}%</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">OH / IH / DH (h)</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">
              {hours.oh.toFixed(0)} / {hours.ih.toFixed(0)} / {hours.dh.toFixed(0)}
            </p>
        </div>
      </div>

      {showEmp && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Add employee</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "employee",
                    data: { fullName, profession, employmentType: empType },
                  })
                ) {
                  setShowEmp(false);
                  setFullName("");
                  setProfession("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Profession</Label>
                <Input value={profession} onChange={(e) => setProfession(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Employment type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={empType}
                  onChange={(e) => setEmpType(e.target.value)}
                >
                  {["PERMANENT", "DAILY_CASUAL", "SUBCONTRACTOR_STAFF"].map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEmp(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showAssign && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Labor assignment</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "assignment",
                    data: {
                      employeeId: empId,
                      wbsNodeId: wbsId,
                      date,
                      hoursOnTask: Number(hoursOnTask),
                    },
                  })
                )
                  setShowAssign(false);
              }}
            >
              <div className="space-y-1">
                <Label>Employee</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} · {e.profession}
                    </option>
                  ))}
                </select>
              </div>
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
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hours on task</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={hoursOnTask}
                  onChange={(e) => setHoursOnTask(e.target.value)}
                />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading || !employees.length} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAssign(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showEq && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Register equipment</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "equipment",
                    data: { equipmentType: eqType, plateNo: plateNo || null },
                  })
                ) {
                  setShowEq(false);
                  setEqType("");
                  setPlateNo("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Type</Label>
                <Input
                  value={eqType}
                  onChange={(e) => setEqType(e.target.value)}
                  placeholder="Excavator, Tower crane…"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Plate / ID</Label>
                <Input value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEq(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {showUsage && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Equipment usage (OH / IH / DH)</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "usage",
                    data: {
                      equipmentId: eqId,
                      wbsNodeId: wbsId,
                      date,
                      operatingHours: Number(oh),
                      idleHours: Number(ih),
                      downHours: Number(dh),
                    },
                  })
                )
                  setShowUsage(false);
              }}
            >
              <div className="space-y-1">
                <Label>Equipment</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                  value={eqId}
                  onChange={(e) => setEqId(e.target.value)}
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.equipmentType} {eq.plateNo ? `(${eq.plateNo})` : ""}
                    </option>
                  ))}
                </select>
              </div>
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
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Operating hours</Label>
                <Input type="number" step="0.5" value={oh} onChange={(e) => setOh(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Idle hours</Label>
                <Input type="number" step="0.5" value={ih} onChange={(e) => setIh(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Down hours</Label>
                <Input type="number" step="0.5" value={dh} onChange={(e) => setDh(e.target.value)} />
              </div>
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading || !equipment.length} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log usage"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUsage(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="labor">Labor ({employees.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
          <TabsTrigger value="equipment">Equipment ({equipment.length})</TabsTrigger>
          <TabsTrigger value="usage">Usage ({usageLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="labor" className="mt-4">
          {employees.length === 0 ? (
            <EmptyState icon={Users} title="No employees" description="Add permanent, casual or subcontractor staff." />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Profession</th>
                      <th className="px-4 py-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="px-4 py-3 font-medium">{e.fullName}</td>
                        <td className="px-4 py-3">{e.profession}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.employmentType} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4 space-y-2">
          {assignments.length === 0 ? (
            <EmptyState icon={Users} title="No assignments" description="Assign people to WBS tasks by day." />
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap justify-between gap-2 p-4 text-sm">
                  <div>
                    <span className="font-medium">{a.employee?.fullName}</span>
                    <span className="text-stone-500"> · {a.employee?.profession}</span>
                    <p className="text-xs text-stone-500 mt-1">
                      {a.wbsNode?.code} — {a.wbsNode?.name}
                    </p>
                  </div>
                  <div className="text-right text-xs text-stone-600">
                    <div>{formatDate(a.date)}</div>
                    <div className="font-medium tabular-nums">{Number(a.hoursOnTask)}h</div>
                  </div>
        </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          {equipment.length === 0 ? (
            <EmptyState icon={Truck} title="No equipment" description="Register plant against the contractor organization." />
          ) : (
            <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                    <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Plate</th>
                      <th className="px-4 py-3">Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((eq) => (
                      <tr key={eq.id} className="border-b hover:bg-[#FDFCF9]">
                        <td className="px-4 py-3 font-medium">{eq.equipmentType}</td>
                        <td className="px-4 py-3 font-mono text-xs">{eq.plateNo || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{eq.serialNo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="mt-4 space-y-2">
          {usageLogs.length === 0 ? (
            <EmptyState icon={Truck} title="No usage logs" description="Log operating, idle and down hours daily." />
          ) : (
            usageLogs.map((u) => (
              <div key={u.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap justify-between gap-2 p-4 text-sm">
                  <div>
                    <span className="font-medium">{u.equipment?.equipmentType}</span>
                    {u.equipment?.plateNo && (
                      <span className="font-mono text-xs text-stone-500"> · {u.equipment.plateNo}</span>
                    )}
                    <p className="text-xs text-stone-500 mt-1">
                      {u.wbsNode?.code} · {formatDate(u.date)}
                    </p>
                  </div>
                  <div className="text-xs tabular-nums text-stone-700">
                    OH {Number(u.operatingHours)} · IH {Number(u.idleHours)} · DH{" "}
                    {Number(u.downHours)}
                  </div>
        </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
