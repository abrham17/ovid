"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titleCase } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Copy, Check, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ROLES = [
  "FOREMAN",
  "SUPERINTENDENT",
  "SITE_ENGINEER",
  "DEPUTY_PM",
  "SENIOR_PM",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "QS",
  "PROCUREMENT",
  "FINANCE",
  "HR",
  "EQUIPMENT_MANAGER",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "ADMIN",
] as const;

type Membership = {
  id: string;
  projectRole: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    jobTitle?: string;
  };
  organization?: { name: string; partyType: string } | null;
};

type Invitation = {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
  status: string;
  expiresAt: string | Date;
  invitedBy?: { fullName: string } | null;
};

type InviteRow = {
  fullName: string;
  email: string;
  jobTitle: string;
  role: (typeof ROLES)[number];
};

type Props = {
  projectId: string;
  memberships: Membership[];
  invitations: Invitation[];
  canInvite: boolean;
};

export function TeamView({ projectId, memberships, invitations, canInvite }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Simplified multi-row bulk invitation state
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { fullName: "", email: "", jobTitle: "", role: "FOREMAN" },
  ]);

  const pending = invitations.filter((i) => i.status === "PENDING");

  function addRow() {
    setInviteRows((prev) => [
      ...prev,
      { fullName: "", email: "", jobTitle: "", role: "SITE_ENGINEER" },
    ]);
  }

  function removeRow(index: number) {
    if (inviteRows.length === 1) return;
    setInviteRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof InviteRow, value: string) {
    setInviteRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function submitBulkInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedLinks([]);

    // Filter valid rows with email
    const validInvitations = inviteRows
      .filter((r) => r.email.trim() !== "")
      .map((r) => ({
        fullName: r.fullName.trim() || "Staff Member",
        email: r.email.trim(),
        jobTitle: r.jobTitle.trim() || r.role,
        role: r.role,
        projectId: projectId,
      }));

    if (validInvitations.length === 0) {
      setError("Please enter at least one email address");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          invitations: validInvitations,
        }),
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        setError(json.error || "Invitation failed. Please check parameters.");
        return;
      }

      const rows = Array.isArray(json.data) ? json.data : [];
      const links: string[] = [];
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      for (const row of rows) {
        if (row.token) {
          links.push(`${origin}/accept-invite/${row.token}`);
        }
      }

      if (links.length > 0) {
        setCreatedLinks(links);
      }

      // Reset form
      setInviteRows([{ fullName: "", email: "", jobTitle: "", role: "FOREMAN" }]);
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network connection error");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(invitationId: string) {
    if (!confirm("Revoke this pending invitation?")) return;
    setLoading(true);
    try {
      await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", invitationId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(link: string, index: number) {
    await navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header section matching warm terracotta & cream design */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2C2420]">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {memberships.length} active member{memberships.length === 1 ? "" : "s"}
            {pending.length > 0 ? ` · ${pending.length} pending invitation(s)` : ""}
          </p>
        </div>

        {canInvite && (
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-[#C04928] hover:bg-[#A33A1F] text-white font-medium shadow-xs"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            {showForm ? "Close Invite Form" : "Invite Members"}
          </Button>
        )}
      </div>

      {/* Display generated invite links */}
      {createdLinks.length > 0 && (
        <div className="rounded-2xl border border-[#C8E6C9] bg-[#E3F2E6]/60 p-6 space-y-3">
          <h3 className="font-serif text-sm font-bold text-[#2E7D32]">
            Invitations Sent Successfully! Copy links to share:
          </h3>
          {createdLinks.map((link, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#C8E6C9]">
              <code className="truncate font-mono text-xs text-stone-800">{link}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink(link, idx)}>
                {copiedIndex === idx ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1 text-xs">{copiedIndex === idx ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Simplified Bulk Invitation Form */}
      {showForm && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#2C2420]">Simple Bulk Invitation</h3>
            <p className="mt-1 text-xs text-stone-500">
              Invite team members directly to this project. Enter their name, email address, job title, and role below.
            </p>
          </div>

          <form onSubmit={submitBulkInvite} className="space-y-4">
            {inviteRows.map((row, idx) => (
              <div key={idx} className="grid gap-3 rounded-xl border border-[#EFE8DE] bg-white p-4 sm:grid-cols-12 items-end">
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs text-stone-600">Full Name</Label>
                  <Input
                    value={row.fullName}
                    onChange={(e) => updateRow(idx, "fullName", e.target.value)}
                    placeholder="e.g. Abebe Bikila"
                    required
                    className="bg-white border-[#D8D0C5]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs text-stone-600">Email Address</Label>
                  <Input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(idx, "email", e.target.value)}
                    placeholder="name@organization.com"
                    required
                    className="bg-white border-[#D8D0C5]"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-stone-600">Job Title</Label>
                  <Input
                    value={row.jobTitle}
                    onChange={(e) => updateRow(idx, "jobTitle", e.target.value)}
                    placeholder="e.g. Site Engineer"
                    className="bg-white border-[#D8D0C5]"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-stone-600">Role</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-[#D8D0C5] bg-white px-3 text-sm text-stone-800"
                    value={row.role}
                    onChange={(e) => updateRow(idx, "role", e.target.value as any)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {titleCase(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {inviteRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(idx)}
                      className="text-stone-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {error && <p className="text-xs font-semibold text-[#C04928]">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="border-[#D8D0C5] text-stone-700 hover:bg-[#FAF7F2]"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Row
              </Button>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="bg-[#C04928] hover:bg-[#A33A1F] text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                  Send Invitations
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Members Table */}
      <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#2C2420]">Active Project Members</h3>

        {memberships.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-500 font-serif">
            No active project members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="pb-3 px-3">Name</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Organization</th>
                  <th className="pb-3 px-3">Project Role</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DE]">
                {memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="py-3.5 px-3 font-semibold text-[#2C2420]">{m.user.fullName}</td>
                    <td className="py-3.5 px-3 text-stone-600">{m.user.email}</td>
                    <td className="py-3.5 px-3 text-xs text-stone-500">{m.organization?.name ?? "Ovid Construction"}</td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block rounded bg-[#F2ECE1] px-2.5 py-0.5 text-xs font-semibold text-stone-800">
                        {titleCase(m.projectRole || m.user.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-full bg-[#E3F2E6] px-3 py-0.5 text-xs font-semibold text-[#2E7D32]">
                        Approved
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <div className="rounded-2xl border border-[#EFE8DE] bg-[#FDFCF9] p-6 shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#2C2420]">Pending Invitations</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFE8DE] text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="pb-3 px-3">Recipient</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Expires</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DE]">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FAF7F2]/60">
                    <td className="py-3.5 px-3 font-medium text-stone-800">{inv.fullName ?? "Staff"}</td>
                    <td className="py-3.5 px-3 text-stone-600">{inv.email}</td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block rounded bg-[#F2ECE1] px-2.5 py-0.5 text-xs font-semibold text-stone-800">
                        {titleCase(inv.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-full bg-[#FDE8E2] px-3 py-0.5 text-xs font-semibold text-[#C04928]">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-stone-500">{formatDate(inv.expiresAt)}</td>
                    <td className="py-3.5 px-3 text-right">
                      {inv.status === "PENDING" && canInvite && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revoke(inv.id)}
                          className="text-stone-400 hover:text-red-600 hover:bg-red-50 text-xs"
                        >
                          Revoke
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
    </div>
  );
}
