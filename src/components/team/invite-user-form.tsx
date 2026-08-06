"use client";

import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { inviteUser } from "@/lib/actions/invitations";
import { ROLE_LABELS } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

type OrgOption = { id: string; name: string; partyType: PartyType };
type ProjectOption = { id: string; code: string; name: string };

export function InviteUserForm({
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
  return (
    <ActionForm action={inviteUser} successMessage="Invitation sent." className="space-y-3">
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required minLength={2} placeholder="Abebe Kebede" />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="worker@company.com" />
      </Field>
      <Field label="Job title" htmlFor="jobTitle">
        <Input id="jobTitle" name="jobTitle" required placeholder="Site Foreman" />
      </Field>
      <Field label="Role" htmlFor="role">
        <Select id="role" name="role" required defaultValue={roles[0] ?? "FOREMAN"}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Phone (optional)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" placeholder="+251…" />
      </Field>
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
      <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
    </ActionForm>
  );
}
