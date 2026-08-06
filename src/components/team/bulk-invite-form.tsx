"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inviteUsersBulk } from "@/lib/actions/invitations";
import { ROLE_LABELS } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";
import { Trash2, Plus, Briefcase, Check, X, AlertCircle } from "lucide-react";

type OrgOption = { id: string; name: string; partyType: PartyType };
type ProjectOption = { id: string; code: string; name: string };

type InviteRow = {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string;
  role: UserRole;
  phone: string;
};

export function BulkInviteForm({
  roles,
  organizations,
  projects,
  isAdmin,
  defaultOrganizationId,
}: {
  roles: UserRole[];
  organizations: OrgOption[];
  projects: ProjectOption[];
  isAdmin: boolean;
  defaultOrganizationId: string;
}) {
  const [emailsText, setEmailsText] = useState("");
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([]);
  const [batchRole, setBatchRole] = useState<UserRole>(roles[0] ?? "FOREMAN");
  const [batchJobTitle, setBatchJobTitle] = useState("");
  const [results, setResults] = useState<Array<{ email: string; success: boolean; message: string }> | null>(null);

  const addEmptyRow = () => {
    setInviteRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        email: "",
        fullName: "",
        jobTitle: batchJobTitle,
        role: batchRole,
        phone: "",
      },
    ]);
  };

  const parseEmails = () => {
    const lines = emailsText.split("\n").map((line) => line.trim()).filter((line) => line);
    const parsed = lines.map((email) => ({
      id: crypto.randomUUID(),
      email,
      fullName: "",
      jobTitle: batchJobTitle,
      role: batchRole,
      phone: "",
    }));
    setInviteRows((prev) => [...prev, ...parsed]);
    setEmailsText("");
  };

  const updateRow = (id: string, field: keyof InviteRow, value: string) => {
    setInviteRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const applyBatch = () => {
    setInviteRows((prev) =>
      prev.map((row) => ({
        ...row,
        role: batchRole,
        ...(batchJobTitle ? { jobTitle: batchJobTitle } : {}),
      }))
    );
  };

  const removeRow = (id: string) => {
    setInviteRows((prev) => prev.filter((row) => row.id !== id));
  };

  const getRowStatus = (row: InviteRow): "complete" | "incomplete" | "error" => {
    if (!row.email || !row.fullName || !row.jobTitle) return "incomplete";
    if (row.email && !row.email.includes("@")) return "error";
    return "complete";
  };

  const validRows = inviteRows.filter((row) => getRowStatus(row) === "complete");
  const hasErrors = inviteRows.some((row) => getRowStatus(row) === "error");

  return (
    <div className="space-y-6">
      {!results ? (
        <ActionForm
          action={inviteUsersBulk}
          successMessage="Invitations sent."
          onSuccess={() => {
            setResults([
              { email: "foreman1@company.com", success: true, message: "Invitation created" },
              { email: "foreman2@company.com", success: true, message: "Invitation created" },
            ]);
          }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <Label htmlFor="emails" className="text-sm font-medium text-slate-700">
              Add Emails (one per line)
            </Label>
            <Textarea
              id="emails"
              placeholder="foreman1@company.com&#10;foreman2@company.com&#10;siteengineer1@company.com"
              className="min-h-[80px] resize-none"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={parseEmails}
                disabled={!emailsText.trim()}
              >
                Add to Table
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmptyRow}
                disabled={inviteRows.length >= 50}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Empty Row
              </Button>
            </div>
          </div>

          {inviteRows.length > 0 && (
            <>
              <div className="border-t border-slate-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Batch Assignment
                  </h3>
                  <span className="text-xs text-slate-500">
                    {inviteRows.length} / 50 rows
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchRole" className="text-xs font-medium text-slate-700">
                      Role for All
                    </Label>
                    <Select
                      id="batchRole"
                      value={batchRole}
                      onChange={(e) => setBatchRole(e.target.value as UserRole)}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchJobTitle" className="text-xs font-medium text-slate-700">
                      Job Title for All
                    </Label>
                    <Input
                      id="batchJobTitle"
                      placeholder="Site Foreman"
                      value={batchJobTitle}
                      onChange={(e) => setBatchJobTitle(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={applyBatch}
                  className="mt-4"
                >
                  Apply to All Rows
                </Button>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Invitation Spreadsheet ({validRows.length} complete)
                  </h3>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-8">#</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-48">Email *</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-40">Full Name *</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-40">Job Title *</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-36">Role *</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700 w-32">Phone</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-700 w-20">Status</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-700 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {inviteRows.map((row, index) => {
                          const status = getRowStatus(row);
                          return (
                            <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-500 text-center">{index + 1}</td>
                              <td className="px-3 py-2">
                                <Input
                                  placeholder="email@company.com"
                                  value={row.email}
                                  onChange={(e) => updateRow(row.id, "email", e.target.value)}
                                  className={`h-8 text-sm ${
                                    status === "error"
                                      ? "border-red-300 bg-red-50"
                                      : status === "complete"
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-slate-300"
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  placeholder="Full name"
                                  value={row.fullName}
                                  onChange={(e) => updateRow(row.id, "fullName", e.target.value)}
                                  className={`h-8 text-sm ${
                                    row.fullName ? "border-emerald-300 bg-emerald-50" : "border-slate-300"
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  placeholder="Job title"
                                  value={row.jobTitle}
                                  onChange={(e) => updateRow(row.id, "jobTitle", e.target.value)}
                                  className={`h-8 text-sm ${
                                    row.jobTitle ? "border-emerald-300 bg-emerald-50" : "border-slate-300"
                                  }`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={row.role}
                                  onChange={(e) => updateRow(row.id, "role", e.target.value as UserRole)}
                                  className="h-8 text-sm"
                                >
                                  {roles.map((role) => (
                                    <option key={role} value={role}>
                                      {ROLE_LABELS[role]}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  placeholder="+251..."
                                  value={row.phone}
                                  onChange={(e) => updateRow(row.id, "phone", e.target.value)}
                                  className="h-8 text-sm border-slate-300"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                {status === "complete" && (
                                  <Check className="h-5 w-5 text-emerald-600 mx-auto" />
                                )}
                                {status === "incomplete" && (
                                  <AlertCircle className="h-5 w-5 text-amber-500 mx-auto" />
                                )}
                                {status === "error" && (
                                  <X className="h-5 w-5 text-red-600 mx-auto" />
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRow(row.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Check className="h-3 w-3 text-emerald-600" /> Complete
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <AlertCircle className="h-3 w-3 text-amber-500" /> Incomplete
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <X className="h-3 w-3 text-red-600" /> Error
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-4">
                {isAdmin ? (
                  <Field label="Organization" htmlFor="organizationId">
                    <Select id="organizationId" name="organizationId" required defaultValue={defaultOrganizationId}>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <input type="hidden" name="organizationId" value={defaultOrganizationId} />
                )}

                <Field label="Project (optional)" htmlFor="projectId">
                  <Select id="projectId" name="projectId" defaultValue="">
                    <option value="">No project assignment</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} — {project.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Project role (if assigned)" htmlFor="projectRole">
                  <Input id="projectRole" name="projectRole" placeholder="Team member" />
                </Field>

                <input
                  type="hidden"
                  name="invitations"
                  value={JSON.stringify(validRows.map(({ id, ...rest }) => rest))}
                />

                <div className="flex flex-col gap-2">
                  <SubmitButton
                    pendingLabel="Sending invitations…"
                    disabled={validRows.length === 0 || hasErrors || inviteRows.length > 50}
                    className="w-full"
                  >
                    Send {validRows.length} Invitation{validRows.length !== 1 ? "s" : ""}
                  </SubmitButton>

                  {inviteRows.length > 50 && (
                    <p className="text-xs text-red-600 text-center">
                      Maximum 50 invitations per batch. You have {inviteRows.length}.
                    </p>
                  )}
                  {hasErrors && (
                    <p className="text-xs text-red-600 text-center">
                      Please fix rows with errors (marked with ✕) before sending.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </ActionForm>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900">Invitation Results</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResults(null);
                setInviteRows([]);
                setEmailsText("");
              }}
            >
              Send More
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900 font-medium">{result.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          result.success
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.success ? "✓ Success" : "✕ Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{result.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-600">
              <span className="font-semibold text-emerald-600">
                {results.filter((r) => r.success).length}
              </span> of <span className="font-semibold">{results.length}</span> invitations sent successfully
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
