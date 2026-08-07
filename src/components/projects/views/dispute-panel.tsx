"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { Plus, Loader2, AlertTriangle } from "lucide-react";

type Dispute = {
  id: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  reason: string;
  resolution: string | null;
  escalationTo: string | null;
  disputedBy: { fullName: string; role: string } | null;
  resolvedBy: { fullName: string; role: string } | null;
  resolvedAt: string | null;
  defectLog: { description: string; status: string } | null;
  itr: { result: string; inspectionType: string } | null;
  wbsNode: { code: string; name: string } | null;
  createdAt: string;
};

type Props = {
  projectId: string;
  canCreate: boolean;
  canResolve: boolean;
};

export function DisputePanel({ projectId, canCreate, canResolve }: Props) {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createReason, setCreateReason] = useState("");
  const [createEscalation, setCreateEscalation] = useState("");

  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolvedStatus, setResolvedStatus] = useState<"UNDER_REVIEW" | "RESOLVED">("RESOLVED");

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/disputes?projectId=${projectId}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to load disputes");
        return;
      }
      setDisputes(json.data ?? []);
    } catch {
      setError("Network error");
    }
  }

  useEffect(() => {
    load();
  }, [projectId]);

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/disputes", {
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

  const openCount = disputes.filter((d) => d.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Disputes
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {disputes.length} dispute(s) · {openCount} open
          </p>
        </div>
        {canCreate && (
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-[#C04928] hover:bg-[#A33A1F] text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" /> New Dispute
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold text-[#C04928]">
          {error} <button className="underline" onClick={load}>Retry</button>
        </p>
      )}

      <Separator />

      {disputes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-stone-300" />
          <p className="text-sm font-medium text-stone-600">No disputes</p>
          <p className="text-xs text-stone-500">
            Disputes raised against QC fails and contract items appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id} className="p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={d.status} />
                    {d.escalationTo && (
                      <Badge variant="warning" size="sm">
                        → {d.escalationTo}
                      </Badge>
                    )}
                    {d.wbsNode && (
                      <span className="font-mono text-xs text-emerald-700">
                        {d.wbsNode.code}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-800">{d.reason}</p>
                  <p className="text-xs text-stone-500">
                    Disputed by {d.disputedBy?.fullName ?? "Unknown"} ·{" "}
                    {formatDate(d.createdAt)}
                  </p>
                  {d.defectLog && (
                    <p className="text-xs text-stone-500">
                      Defect: {d.defectLog.description}
                    </p>
                  )}
                  {d.itr && (
                    <p className="text-xs text-stone-500">
                      ITR: {d.itr.inspectionType} · {d.itr.result}
                    </p>
                  )}
                </div>
                {d.status === "OPEN" && canResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    className="border-[#D8D0C5] text-stone-800 hover:bg-[#FAF7F2]"
                    onClick={() => {
                      setResolveTarget(d);
                      setResolution("");
                      setResolvedStatus("RESOLVED");
                    }}
                  >
                    Resolve
                  </Button>
                )}
              </div>

              {d.resolution && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-sm text-stone-800">{d.resolution}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Resolved by {d.resolvedBy?.fullName ?? "Unknown"} ·{" "}
                      {formatDate(d.resolvedAt)}
                    </p>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Dispute</DialogTitle>
            <DialogDescription>
              Raise a dispute against a QC result or contract item.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await post({
                kind: "create",
                projectId,
                reason: createReason,
                escalationTo: createEscalation || undefined,
              });
              if (ok) {
                setShowCreate(false);
                setCreateReason("");
                setCreateEscalation("");
                load();
              }
            }}
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">Reason</label>
              <Textarea
                value={createReason}
                onChange={(e) => setCreateReason(e.target.value)}
                required
                rows={3}
                placeholder="Describe the dispute — what was raised and why."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">
                Escalate to (optional)
              </label>
              <Textarea
                value={createEscalation}
                onChange={(e) => setCreateEscalation(e.target.value)}
                rows={2}
                placeholder="e.g. Resident Engineer, Contracts"
              />
            </div>
            {error && <p className="text-xs font-semibold text-[#C04928]">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="border-[#D8D0C5] hover:bg-[#FAF7F2]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog
        open={resolveTarget !== null}
        onOpenChange={(open) => !open && setResolveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>{resolveTarget?.reason}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resolveTarget) return;
              const ok = await post({
                kind: "resolve",
                disputeId: resolveTarget.id,
                resolution,
                resolvedStatus,
              });
              if (ok) {
                setResolveTarget(null);
                setResolution("");
                load();
              }
            }}
          >
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">Resolution</label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                required
                rows={3}
                placeholder="How was the dispute resolved?"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] px-3 text-sm"
                value={resolvedStatus}
                onChange={(e) =>
                  setResolvedStatus(e.target.value as "UNDER_REVIEW" | "RESOLVED")
                }
              >
                <option value="RESOLVED">Resolved</option>
                <option value="UNDER_REVIEW">Under review</option>
              </select>
            </div>
            {error && <p className="text-xs font-semibold text-[#C04928]">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResolveTarget(null)}
                className="border-[#D8D0C5] hover:bg-[#FAF7F2]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}