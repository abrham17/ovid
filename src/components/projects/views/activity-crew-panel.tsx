"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HardHat, Loader2, Trash2, UserPlus } from "lucide-react";
import { titleCase } from "@/lib/constants";

type Assignee = {
  id: string;
  fullName: string;
  role: string;
};

type AssignmentRow = {
  id: string;
  role: string;
  user: Assignee;
  assignedBy?: { fullName: string } | null;
};

type Candidate = {
  id: string;
  fullName: string;
  role: string;
  jobTitle?: string | null;
  organizationName?: string;
};

export type ActivityCrewPanelProps = {
  projectId: string;
  activityId: string;
  assignments: AssignmentRow[];
  canManage: boolean;
  canAssignSiteEngineer: boolean;
  canAssignForeman: boolean;
  mustStayInOwnOrg?: boolean;
  candidates: {
    FOREMAN: Candidate[];
    SITE_ENGINEER: Candidate[];
  };
};

export function ActivityCrewPanel({
  projectId,
  activityId,
  assignments,
  canManage,
  canAssignSiteEngineer,
  canAssignForeman,
  mustStayInOwnOrg,
  candidates,
}: ActivityCrewPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"FOREMAN" | "SITE_ENGINEER">(
    canAssignForeman ? "FOREMAN" : "SITE_ENGINEER"
  );
  const [userId, setUserId] = useState("");

  const siteEngineer = assignments.find((a) => a.role === "SITE_ENGINEER");
  const foreman = assignments.find((a) => a.role === "FOREMAN");
  const eligible = role === "FOREMAN" ? candidates.FOREMAN : candidates.SITE_ENGINEER;

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "assign",
          activityId,
          userId,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to assign");
        return;
      }
      setUserId("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function unassign(assignmentId: string) {
    if (!confirm("Remove this person from the activity?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "unassign", assignmentId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to unassign");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <CrewSlot
          label="Site Engineer"
          person={siteEngineer?.user.fullName}
          assignedBy={siteEngineer?.assignedBy?.fullName}
          canRemove={canManage && Boolean(siteEngineer) && canAssignSiteEngineer}
          onRemove={siteEngineer ? () => unassign(siteEngineer.id) : undefined}
          loading={loading}
        />
        <CrewSlot
          label="Foreman"
          person={foreman?.user.fullName}
          assignedBy={foreman?.assignedBy?.fullName}
          canRemove={canManage && Boolean(foreman) && canAssignForeman}
          onRemove={foreman ? () => unassign(foreman.id) : undefined}
          loading={loading}
        />
      </div>

      {canManage && (
        <form
          onSubmit={assign}
          className="space-y-3 rounded-lg border border-[#EFE8DE] bg-[#FAF7F2] p-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <UserPlus className="h-4 w-4 text-[#C04928]" />
            Assign crew
          </div>
          {mustStayInOwnOrg && (
            <p className="text-xs text-stone-500">
              You can only assign Site Engineers and Foremen from your organization,
              on activities inside your WBS section.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-600">Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as typeof role);
                  setUserId("");
                }}
              >
                {canAssignForeman && <option value="FOREMAN">Foreman</option>}
                {canAssignSiteEngineer && (
                  <option value="SITE_ENGINEER">Site Engineer</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-stone-600">Person</Label>
              <select
                className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {eligible.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                    {c.organizationName ? ` · ${c.organizationName}` : ""}
                    {c.jobTitle ? ` (${c.jobTitle})` : ""}
                  </option>
                ))}
              </select>
              {eligible.length === 0 && (
                <p className="text-xs text-stone-500">
                  No eligible {titleCase(role)} on this project
                  {mustStayInOwnOrg ? " in your organization" : ""}. Invite them on
                  Team first.
                </p>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={loading || !userId}
            className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
          </Button>
        </form>
      )}
    </div>
  );
}

function CrewSlot({
  label,
  person,
  assignedBy,
  canRemove,
  onRemove,
  loading,
}: {
  label: string;
  person?: string;
  assignedBy?: string;
  canRemove?: boolean;
  onRemove?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF2E9] text-[#C04928]">
          <HardHat className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-stone-500">{label}</p>
          <p className="font-medium text-stone-900 truncate">
            {person ?? "Not assigned"}
          </p>
          {assignedBy && (
            <p className="text-[11px] text-stone-400">Assigned by {assignedBy}</p>
          )}
        </div>
      </div>
      {canRemove && onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
