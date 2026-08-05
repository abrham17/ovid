import { requireUser } from "@/lib/rbac";
import { getAdminOverviewData } from "@/lib/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createOrganization,
  createUser,
  createProject,
  createMembership,
} from "@/lib/actions/admin";
import { PARTY_LABELS, ROLE_LABELS, titleCase } from "@/lib/constants";
import type { PartyType } from "@/generated/prisma/enums";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">
          Admin access only.
        </CardContent>
      </Card>
    );
  }

  const { organizations, projects, users, memberships, contractorOrgs } = await getAdminOverviewData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organizations, users, projects and memberships.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOrganization} className="space-y-3">
              <Field label="Name">
                <Input name="name" required placeholder="Ovid Construction PLC" />
              </Field>
              <Field label="Amharic name">
                <Input name="nameAmharic" placeholder="ኦቪድ ኮንስትራክሽን" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Party type">
                  <Select name="partyType" className="w-full" defaultValue="CONTRACTOR">
                    {Object.keys(PARTY_LABELS).map((p) => (
                      <option key={p} value={p}>
                        {PARTY_LABELS[p as PartyType]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Contractor grade">
                  <Select name="contractorGrade" className="w-full" defaultValue="GRADE_1">
                    {[
                      "GRADE_1",
                      "GRADE_2",
                      "GRADE_3",
                      "GRADE_4",
                      "GRADE_5",
                      "GRADE_6",
                      "GRADE_7",
                      "GRADE_8",
                      "GRADE_9",
                      "GRADE_10",
                    ].map((g) => (
                      <option key={g} value={g}>
                        {g.replace("GRADE_", "Grade ")}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="License #">
                  <Input name="licenseNumber" />
                </Field>
                <Field label="Tax ID">
                  <Input name="taxId" />
                </Field>
              </div>
              <Button type="submit">Create organization</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createUser} className="space-y-3">
              <Field label="Organization">
                <Select name="organizationId" className="w-full" required>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({PARTY_LABELS[o.partyType]})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Full name">
                <Input name="fullName" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <Input name="email" type="email" required />
                </Field>
                <Field label="Password">
                  <Input name="password" type="password" required minLength={6} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Job title">
                  <Input name="jobTitle" required placeholder="Site Engineer" />
                </Field>
                <Field label="Role">
                  <Select name="role" className="w-full" required>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Phone">
                <Input name="phone" />
              </Field>
              <Button type="submit">Create user</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create project</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createProject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input name="name" required placeholder="Sector 1 Block 3 — Housing" />
                </Field>
                <Field label="Code">
                  <Input name="code" required placeholder="S1-B3" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select name="projectType" className="w-full" defaultValue="BUILDING">
                    {["ROAD", "BUILDING", "HOUSING", "ENERGY", "OTHER"].map((t) => (
                      <option key={t} value={t}>
                        {titleCase(t)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Contract type">
                  <Select name="contractType" className="w-full" defaultValue="FIDIC_RED">
                    {["FIDIC_RED", "FIDIC_YELLOW", "LOCAL_STANDARD", "OTHER"].map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Contractor org">
                <Select name="contractorOrgId" className="w-full" required>
                  {contractorOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client org">
                  <Select name="clientOrgId" className="w-full" required>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Consultant org">
                  <Select name="consultantOrgId" className="w-full">
                    <option value="">— none —</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Contract value (ETB)">
                <Input name="contractValue" type="number" step="0.01" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Planned start">
                  <Input name="plannedStartDate" type="date" required />
                </Field>
                <Field label="Planned end">
                  <Input name="plannedEndDate" type="date" required />
                </Field>
              </div>
              <Button type="submit">Create project</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grant project membership</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMembership} className="space-y-3">
              <Field label="Project">
                <Select name="projectId" className="w-full" required>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="User">
                <Select name="userId" className="w-full" required>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {u.organization.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Organization (for subcontractor/supplier scope)">
                <Select name="organizationId" className="w-full" required>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Project role">
                <Input name="projectRole" required placeholder="Steel works subcontractor" />
              </Field>
              <Button type="submit">Grant membership</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((o) => (
            <div key={o.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">{o.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline">{PARTY_LABELS[o.partyType]}</Badge>
                {o.contractorGrade && <span>{o.contractorGrade.replace("_", " ")}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">{u.fullName}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                <span>{u.organization.name}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memberships ({memberships.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <div key={m.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">{m.user.fullName}</p>
              <p className="text-xs text-slate-500">
                {m.project.name} · {m.organization.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">{m.projectRole}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}