"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; status?: string; title?: string; scopeDescription?: string; description?: string; contract?: { contractorOrg?: { name: string }; scopeDescription?: string }; contractorOrg?: { name: string }; rootWbsNode?: { code: string; name: string }; wbsNode?: { code: string; name: string } };

async function act(projectId: string, body: object) {
  const response = await fetch(`/api/projects/${projectId}/workflows`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error ?? "Workflow action failed");
  return payload;
}

export function WorkflowHub({ projectId, contracts, plans, oversight, requests }: { projectId: string; contracts: Row[]; plans: Row[]; oversight: Row[]; requests: Row[] }) {
  const router = useRouter(); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const run = async (key: string, body: object) => { setBusy(key); setError(null); try { await act(projectId, body); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(null); } };
  return <div className="space-y-6">
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <List title="Contracts" rows={contracts} empty="No contracts configured" render={(row) => <><div><p className="font-medium">{row.contractorOrg?.name ?? row.scopeDescription}</p><p className="text-xs text-fg-muted">{row.scopeDescription}</p></div>{row.status === "ACTIVE" && <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => run(row.id, { action: "terminate_contract", contractId: row.id })}>Terminate</Button>}</>} />
      <List title="WBS plan submissions" rows={plans} empty="No plan submissions" render={(row) => <><div><p className="font-medium">{row.title}</p><p className="text-xs text-fg-muted">{row.contract?.contractorOrg?.name} · {row.rootWbsNode?.code} {row.rootWbsNode?.name}</p></div><div className="flex gap-2"><Badge variant="outline">{row.status}</Badge>{row.status === "SUBMITTED" && <><Button size="sm" disabled={busy === row.id} onClick={() => run(row.id, { action: "review_plan", submissionId: row.id, decision: "APPROVE" })}>Approve</Button><Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => run(row.id, { action: "review_plan", submissionId: row.id, decision: "REQUEST_REVISION", comments: "Please revise the submitted plan." })}>Revise</Button></>}</div></>} />
      <List title="Oversight assignments" rows={oversight} empty="No oversight assignments" render={(row) => <><div><p className="font-medium">{row.contract?.contractorOrg?.name}</p><p className="text-xs text-fg-muted">{row.wbsNode?.code} {row.wbsNode?.name}</p></div><Badge variant="outline">Active</Badge></>} />
      <List title="Resource requests" rows={requests} empty="No resource requests" render={(row) => <><div><p className="font-medium">{row.description}</p><p className="text-xs text-fg-muted">{row.contract?.contractorOrg?.name} · {row.wbsNode?.code}</p></div><div className="flex gap-2"><Badge variant="outline">{row.status}</Badge>{row.status === "PENDING" && <><Button size="sm" disabled={busy === row.id} onClick={() => run(row.id, { action: "review_resource_request", requestId: row.id, decision: "APPROVE" })}>Approve</Button><Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => run(row.id, { action: "review_resource_request", requestId: row.id, decision: "REJECT", reason: "Request rejected during review" })}>Reject</Button></>}</div></>} />
    </div>
  </div>;
}

function List({ title, rows, empty, render }: { title: string; rows: Row[]; empty: string; render: (row: Row) => React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.length === 0 ? <p className="text-sm text-fg-muted">{empty}</p> : rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3">{render(row)}</div>)}</CardContent></Card>;
}
