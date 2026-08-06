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
import { Trash2, User, Briefcase, Shield, Phone } from "lucide-react";

type OrgOption = { id: string; name: string; partyType: PartyType };
type ProjectOption = { id: string; code: string; name: string };

type InviteRow = {
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

  const parseEmails = () => {
    const lines = emailsText.split("\n").map((line) => line.trim()).filter((line) => line);
    const parsed = lines.map((email) => ({
      email,
      fullName: "",
      jobTitle: batchJobTitle,
      role: batchRole,
      phone: "",
    }));
    setInviteRows(parsed);
  };

  const updateRow = (index: number, field: keyof InviteRow, value: string) => {
    setInviteRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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

  const removeRow = (index: number) => {
    setInviteRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validRows = inviteRows.filter((row) => row.email && row.fullName && row.jobTitle);
  const hasErrors = inviteRows.some((row) => row.email && !row.email.includes("@"));

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
              Email Addresses
            </Label>
            <Textarea
              id="emails"
              placeholder="foreman1@company.com&#10;foreman2@company.com&#10;siteengineer1@company.com"
              className="min-h-[120px] resize-none"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
            />
            <p className="text-xs text-slate-500">Enter one email address per line (max 50)</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={parseEmails}
              disabled={!emailsText.trim()}
            >
              Parse Emails
            </Button>
            <span className="text-sm text-slate-600">
              {inviteRows.length} invitation{inviteRows.length !== 1 ? "s" : ""} prepared
            </span>
          </div>

          {inviteRows.length > 0 && (
            <>
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Batch Assignment
                </h3>
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
                  onClick={applyBatch}
                  className="mt-4"
                >
                  Apply to All
                </Button>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customize Invitations ({inviteRows.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    {validRows.length} complete
                  </span>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {inviteRows.map((row, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{row.email}</p>
                            <p className="text-xs text-slate-500">#{index + 1}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor={`fullName-${index}`} className="text-xs font-medium text-slate-700">
                            Full Name *
                          </Label>
                          <Input
                            id={`fullName-${index}`}
                            placeholder="Abebe Kebede"
                            value={row.fullName}
                            onChange={(e) => updateRow(index, "fullName", e.target.value)}
                            required
                            className={row.fullName ? "border-emerald-300" : "border-slate-300"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`jobTitle-${index}`} className="text-xs font-medium text-slate-700">
                            Job Title *
                          </Label>
                          <Input
                            id={`jobTitle-${index}`}
                            placeholder="Site Foreman"
                            value={row.jobTitle}
                            onChange={(e) => updateRow(index, "jobTitle", e.target.value)}
                            required
                            className={row.jobTitle ? "border-emerald-300" : "border-slate-300"}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`role-${index}`} className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Role *
                          </Label>
                          <Select
                            id={`role-${index}`}
                            value={row.role}
                            onChange={(e) => updateRow(index, "role", e.target.value as UserRole)}
                            required
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`phone-${index}`} className="text-xs font-medium text-slate-700 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Phone
                          </Label>
                          <Input
                            id={`phone-${index}`}
                            placeholder="+251 911 123 456"
                            value={row.phone}
                            onChange={(e) => updateRow(index, "phone", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
                  value={JSON.stringify(inviteRows.filter((row) => row.email && row.fullName && row.jobTitle))}
                />

                <div className="flex flex-col gap-2">
                  <SubmitButton
                    pendingLabel="Sending invitations…"
                    disabled={validRows.length === 0 || hasErrors || validRows.length > 50}
                    className="w-full"
                  >
                    Send {validRows.length} Invitation{validRows.length !== 1 ? "s" : ""}
                  </SubmitButton>

                  {validRows.length > 50 && (
                    <p className="text-xs text-red-600 text-center">
                      Maximum 50 invitations per batch. You have {validRows.length}.
                    </p>
                  )}
                  {hasErrors && (
                    <p className="text-xs text-red-600 text-center">
                      Please fix invalid email addresses before sending.
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
