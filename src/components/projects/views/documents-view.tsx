"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FileText, Plus, Loader2 } from "lucide-react";

type WbsNode = { id: string; code: string; name: string };

type Props = {
  projectId: string;
  documents: any[];
  wbsNodes: WbsNode[];
  canCreate: boolean;
  canUpdate: boolean;
  canApprove: boolean;
};

const CATEGORIES = [
  "DRAWING",
  "SPECIFICATION",
  "CONTRACT",
  "CORRESPONDENCE",
  "PERMIT",
  "METHOD_STATEMENT",
  "REPORT",
  "OTHER",
] as const;

const NEXT: Record<string, string | null> = {
  DRAFT: "UNDER_REVIEW",
  UNDER_REVIEW: "ISSUED",
  ISSUED: null,
  SUPERSEDED: null,
  WITHDRAWN: null,
};

export function DocumentsView({
  projectId,
  documents,
  wbsNodes,
  canCreate,
  canUpdate,
  canApprove,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docNo, setDocNo] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("DRAWING");
  const [wbsId, setWbsId] = useState("");
  const [rev, setRev] = useState("1");

  const issued = documents.filter((d) => d.status === "ISSUED").length;
  const draft = documents.filter((d) => d.status === "DRAFT" || d.status === "UNDER_REVIEW").length;

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
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
            Document Control
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Controlled docs with revision and issue status — ISO 9001 §7.5 style
          </p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs font-medium">
            <Plus className="h-4 w-4 mr-1" />
            New document
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{documents.length}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">In progress</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{draft}</p>
        </div>
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Issued</p>
          <p className="mt-1 text-3xl font-bold text-[#2C2420] tabular-nums">{issued}</p>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-bold text-[#2C2420]">Register document</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await post({
                    kind: "create",
                    data: {
                      docNo,
                      title,
                      category,
                      revisionNo: Number(rev) || 1,
                      wbsNodeId: wbsId || null,
                    },
                  })
                ) {
                  setShowForm(false);
                  setDocNo("");
                  setTitle("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Doc no</Label>
                <Input value={docNo} onChange={(e) => setDocNo(e.target.value)} required placeholder="DWG-B3-001" />
              </div>
              <div className="space-y-1">
                <Label>Revision</Label>
                <Input type="number" min={1} value={rev} onChange={(e) => setRev(e.target.value)} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
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
                <Label>WBS (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
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
              {error && <p className="sm:col-span-2 text-xs font-semibold text-[#C04928]">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create draft"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#D8D0C5] hover:bg-[#FAF7F2]">
                  Cancel
                </Button>
              </div>
            </form>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Register drawings, specs, method statements and permits with revision control."
        />
      ) : (
        <div className="space-y-2">
          {documents.map((d) => {
            const next = NEXT[d.status];
            return (
              <div key={d.id} className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] shadow-xs flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{d.docNo}</span>
                      <span className="text-xs text-stone-500">Rev {d.revisionNo}</span>
                      <StatusBadge status={d.status} />
                      <StatusBadge status={d.category} />
                    </div>
                    <p className="mt-1 text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Issued by {d.issuedBy?.fullName}
                      {d.approvedBy ? ` · Approved by ${d.approvedBy.fullName}` : ""}
                      {d.wbsNode ? ` · ${d.wbsNode.code}` : ""}
                      {" · "}
                      {formatDate(d.issuedAt)}
                    </p>
                  </div>
                  {next &&
                    ((next === "ISSUED" && canApprove) ||
                      (next !== "ISSUED" && canUpdate)) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() =>
                          post({ kind: "status", documentId: d.id, status: next })
                        }
                      >
                        → {titleCase(next)}
                      </Button>
                    )}
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
