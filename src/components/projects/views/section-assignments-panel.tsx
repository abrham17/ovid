"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { formatDate } from "@/lib/utils";
import { AlertCircle, Loader2, Network, Search, Trash2 } from "lucide-react";

/**
 * Shape the panel needs from `listSectionAssignments`. The page annotates the
 * service rows with this type, so dropping a field from the service `include`
 * breaks the build at the boundary instead of rendering `undefined`.
 */
export type SectionAssignmentRow = {
  id: string;
  role: string;
  /** Prisma DateTime — crosses the RSC boundary as a real Date. */
  assignedAt: Date | string;
  user: { id: string; fullName: string; role: string };
  wbsNode: { id: string; code: string; name: string };
  assignedBy?: { fullName: string } | null;
};

export type SectionMemberOption = {
  user: { id: string; fullName: string; role: string };
};

export type WbsSectionOption = {
  id: string;
  code: string;
  name: string;
  /** 0-based depth in the WBS tree; drives the indent in the picker. */
  depth: number;
};

/** Section-ownership roles, each grantable only to its matching user role. */
const SECTION_ROLES = [
  {
    value: "SUBCONTRACTOR_OWNER",
    userRole: "SUBCONTRACTOR_PM",
    label: "Subcontractor PM",
  },
  {
    value: "SUPERINTENDENT_OWNER",
    userRole: "SUPERINTENDENT",
    label: "Superintendent",
  },
  {
    value: "SITE_ENGINEER_OWNER",
    userRole: "SITE_ENGINEER",
    label: "Site Engineer",
  },
] as const;

type SectionRoleValue = (typeof SECTION_ROLES)[number]["value"];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  SECTION_ROLES.map((r) => [r.value, r.label])
);

/** Non-breaking spaces — a plain space is collapsed inside <option>. */
function indentLabel(option: WbsSectionOption) {
  return `${" ".repeat(option.depth * 3)}${option.code} — ${option.name}`;
}

type Props = {
  projectId: string;
  assignments: SectionAssignmentRow[];
  members: SectionMemberOption[];
  wbsOptions: WbsSectionOption[];
  canAssign: boolean;
  /** Set when a server fetch failed, so the list is empty for a reason. */
  loadError?: string | null;
};

export function SectionAssignmentsPanel({
  projectId,
  assignments,
  members,
  wbsOptions,
  canAssign,
  loadError = null,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sectionRole, setSectionRole] =
    useState<SectionRoleValue>("SUBCONTRACTOR_OWNER");
  const [userId, setUserId] = useState("");
  const [wbsNodeId, setWbsNodeId] = useState("");
  const [wbsFilter, setWbsFilter] = useState("");

  /** Only the row being ended is busy — never the whole list. */
  const [endingId, setEndingId] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<SectionAssignmentRow | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  const activeRole =
    SECTION_ROLES.find((r) => r.value === sectionRole) ?? SECTION_ROLES[0];
  const eligible = members.filter((m) => m.user.role === activeRole.userRole);

  const visibleWbsOptions = useMemo(() => {
    const query = wbsFilter.trim().toLowerCase();
    if (!query) return wbsOptions;
    return wbsOptions.filter(
      (n) =>
        // Keep the current selection listed so filtering never clears the value.
        n.id === wbsNodeId ||
        n.code.toLowerCase().includes(query) ||
        n.name.toLowerCase().includes(query)
    );
  }, [wbsOptions, wbsFilter, wbsNodeId]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !wbsNodeId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "assign_section",
          userId,
          wbsNodeId,
          role: sectionRole,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.success) {
        setFormError(
          json?.error ?? `Failed to assign section (HTTP ${res.status})`
        );
        return;
      }
      setFormError(null);
      setUserId("");
      setWbsNodeId("");
      setWbsFilter("");
      router.refresh();
    } catch {
      setFormError("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmEnd() {
    if (!endTarget) return;
    setEndingId(endTarget.id);
    setEndError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "unassign_section",
          assignmentId: endTarget.id,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.success) {
        setEndError(
          json?.error ?? `Failed to end assignment (HTTP ${res.status})`
        );
        return;
      }
      setEndTarget(null);
      // A successful mutation invalidates any stale message from the form.
      setFormError(null);
      router.refresh();
    } catch {
      setEndError("Network error — check your connection and try again.");
    } finally {
      setEndingId(null);
    }
  }

  function closeEndDialog() {
    if (endingId) return;
    setEndTarget(null);
    setEndError(null);
  }

  if (!canAssign && assignments.length === 0 && !loadError) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs">
      <div className="flex items-center gap-2">
        <Network className="h-5 w-5 text-[#C04928]" />
        <h2 className="font-serif text-lg font-bold tracking-tight text-[#2C2420]">
          WBS section ownership
        </h2>
      </div>
      <p className="text-sm text-stone-500 max-w-2xl">
        Assign a Subcontractor PM, Superintendent or Site Engineer to a WBS section.
        Their operational view is scoped to that subtree (and descendants).
      </p>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#EFE8DE] bg-white px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#2C2420]">
            No sections are owned yet
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {canAssign
              ? "Pick an ownership role, a team member and a WBS section below — they will get write access to that branch and everything under it."
              : "A Senior or Deputy Project Manager assigns WBS section ownership on this page."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#EFE8DE] rounded-lg border border-[#EFE8DE] bg-white">
          {assignments.map((a) => {
            const isEnding = endingId === a.id;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <div>
                    <span className="font-medium text-stone-900">
                      {a.user.fullName}
                    </span>
                    <span className="text-stone-500">
                      {" "}
                      · {a.wbsNode.code} {a.wbsNode.name}
                    </span>
                    <span className="ml-2 rounded bg-[#F5F0E8] px-1.5 py-0.5 text-xs font-medium text-stone-600">
                      {ROLE_LABEL[a.role] ?? a.role}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Assigned {formatDate(a.assignedAt)}
                    {a.assignedBy ? ` by ${a.assignedBy.fullName}` : ""}
                  </p>
                </div>
                {canAssign && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isEnding}
                    aria-label={`End ${a.user.fullName}'s ownership of ${a.wbsNode.code}`}
                    onClick={() => {
                      setEndError(null);
                      setEndTarget(a);
                    }}
                  >
                    {isEnding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canAssign && (
        <form
          onSubmit={assign}
          className="grid gap-3 rounded-lg border border-[#EFE8DE] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="section-role" className="text-xs text-stone-600">
              Ownership role
            </Label>
            <select
              id="section-role"
              className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm"
              value={sectionRole}
              onChange={(e) => {
                setSectionRole(e.target.value as SectionRoleValue);
                setUserId("");
              }}
            >
              {SECTION_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-user" className="text-xs text-stone-600">
              {activeRole.label}
            </Label>
            <select
              id="section-user"
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
                No {activeRole.label} on this project yet — add one on the Team page
                first.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-wbs" className="text-xs text-stone-600">
              WBS section{" "}
              {wbsOptions.length > 0 && (
                <span className="font-normal text-stone-400">
                  ({wbsOptions.length})
                </span>
              )}
            </Label>
            {wbsOptions.length > 8 && (
              <Input
                type="search"
                value={wbsFilter}
                onChange={(e) => setWbsFilter(e.target.value)}
                placeholder="Filter by code or name"
                aria-label="Filter WBS sections"
                startAdornment={<Search className="h-3.5 w-3.5" />}
                className="h-9 text-xs"
              />
            )}
            <select
              id="section-wbs"
              className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 font-mono text-sm"
              value={wbsNodeId}
              onChange={(e) => setWbsNodeId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {visibleWbsOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {indentLabel(n)}
                </option>
              ))}
            </select>
            {wbsOptions.length === 0 ? (
              <p className="text-xs text-stone-500">
                This project has no WBS nodes yet — build the breakdown in the tree
                above, then assign ownership here.
              </p>
            ) : (
              visibleWbsOptions.length === 0 && (
                <p className="text-xs text-stone-500">
                  No section matches “{wbsFilter.trim()}” — clear the filter to see
                  all {wbsOptions.length}.
                </p>
              )
            )}
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              loading={submitting}
              disabled={!userId || !wbsNodeId}
              className="bg-[#C04928] hover:bg-[#A33A1F] text-white"
            >
              Assign WBS
            </Button>
          </div>
          {formError && (
            <p
              role="alert"
              className="sm:col-span-2 lg:col-span-4 text-sm text-danger"
            >
              {formError}
            </p>
          )}
        </form>
      )}

      <ModalDialog
        isOpen={endTarget !== null}
        onClose={closeEndDialog}
        title="End this section assignment?"
        description={
          endTarget
            ? `${endTarget.user.fullName} loses write access to ${endTarget.wbsNode.code} ${endTarget.wbsNode.name} and everything under it. Existing records are kept.`
            : undefined
        }
      >
        <div className="space-y-4">
          {endError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{endError}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeEndDialog}
              disabled={endingId !== null}
            >
              Keep assignment
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmEnd}
              loading={endingId !== null}
            >
              End assignment
            </Button>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
}
