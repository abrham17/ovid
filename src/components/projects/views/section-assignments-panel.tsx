"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Network } from "lucide-react";

type SectionAssignment = {
  id: string;
  role: string;
  user: { id: string; fullName: string; role: string };
  wbsNode: { id: string; code: string; name: string };
  assignedBy?: { fullName: string } | null;
};

type Member = {
  user: { id: string; fullName: string; role: string };
};

type WbsOption = { id: string; code: string; name: string };

type Props = {
  projectId: string;
  assignments: SectionAssignment[];
  members: Member[];
  wbsOptions: WbsOption[];
  canAssign: boolean;
};

export function SectionAssignmentsPanel({
  projectId,
  assignments,
  members,
  wbsOptions,
  canAssign,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [wbsNodeId, setWbsNodeId] = useState("");

  const eligible = members.filter((m) => m.user.role === "SUBCONTRACTOR_PM");
  const subAssignments = assignments.filter(
    (a) => a.role === "SUBCONTRACTOR_OWNER" || a.user.role === "SUBCONTRACTOR_PM"
  );

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !wbsNodeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "assign_section",
          userId,
          wbsNodeId,
          role: "SUBCONTRACTOR_OWNER",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to assign section");
        return;
      }
      setUserId("");
      setWbsNodeId("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function unassign(assignmentId: string) {
    if (!confirm("End this subcontractor WBS assignment?")) return;
    setLoading(true);
    try {
      await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "unassign_section", assignmentId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!canAssign && subAssignments.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2">
        <Network className="h-5 w-5 text-[#C04928]" />
        <h2 className="font-serif text-lg font-bold tracking-tight text-[#2C2420]">
          Subcontractor WBS assignment
        </h2>
      </div>
      <p className="text-sm text-stone-500 max-w-2xl">
        Assign a Subcontractor Project Manager to a WBS section. Their organization&apos;s
        operational view is scoped to that subtree (and descendants).
      </p>

      {subAssignments.length === 0 ? (
        <p className="text-sm text-stone-500">No active subcontractor section assignments.</p>
      ) : (
        <ul className="divide-y divide-[#EFE8DE] rounded-lg border border-[#EFE8DE] bg-white">
          {subAssignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium text-stone-900">{a.user.fullName}</span>
                <span className="text-stone-500">
                  {" "}
                  · {a.wbsNode.code} {a.wbsNode.name}
                </span>
              </div>
              {canAssign && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => unassign(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAssign && (
        <form
          onSubmit={assign}
          className="grid gap-3 rounded-lg border border-[#EFE8DE] bg-white p-4 sm:grid-cols-3"
        >
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Subcontractor PM</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {eligible.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.fullName}
                </option>
              ))}
            </select>
            {eligible.length === 0 && (
              <p className="text-xs text-stone-500">
                Invite a Subcontractor PM on the Team page first.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">WBS section</Label>
            <select
              className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
              value={wbsNodeId}
              onChange={(e) => setWbsNodeId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {wbsOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.code} — {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={loading || !userId || !wbsNodeId}
              className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign WBS"}
            </Button>
          </div>
          {error && (
            <p className="sm:col-span-3 text-sm text-destructive">{error}</p>
          )}
        </form>
      )}
    </section>
  );
}
