"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

const PROJECT_TYPES = ["ROAD", "BUILDING", "HOUSING", "ENERGY", "GREEN_PARK", "OTHER"] as const;
const CONTRACT_TYPES = ["FIDIC_RED", "FIDIC_YELLOW", "ETHIO_STANDARD", "OTHER"] as const;

type OrgOption = { id: string; name: string; partyType: string };

export function ProjectForm({ organizations }: { organizations: OrgOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clients = organizations.filter((o) => o.partyType === "CLIENT");
  const consultants = organizations.filter((o) => o.partyType === "CONSULTANT");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      code: (form.get("code") as string).toUpperCase(),
      projectType: form.get("projectType") as string,
      contractType: form.get("contractType") as string,
      contractValue: Number(form.get("contractValue")),
      plannedStartDate: form.get("plannedStartDate") as string,
      plannedEndDate: form.get("plannedEndDate") as string,
      clientOrgId: form.get("clientOrgId") as string,
      consultantOrgId: (form.get("consultantOrgId") as string) || null,
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.message ?? "Failed to create project");
        return;
      }
      router.push(`/projects/${json.data.id}`);
      router.refresh();
    } catch (err) {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg-default"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">New Project</CardTitle>
          <CardDescription>
            Create a new project in {organizations.length > 0 ? "your organization" : "the system"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" name="name" required minLength={3} maxLength={200} placeholder="e.g. Sector 1 Block 3 Housing" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Project Code</Label>
                <Input id="code" name="code" required minLength={2} maxLength={30} placeholder="e.g. S1-B3" className="uppercase" />
                <p className="text-[10px] text-fg-muted">Uppercase letters, numbers, and hyphens only</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="projectType">Project Type</Label>
                <select
                  id="projectType"
                  name="projectType"
                  required
                  className="flex h-10 w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-fg-default"
                >
                  <option value="">Select type…</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contractType">Contract Type</Label>
                <select
                  id="contractType"
                  name="contractType"
                  required
                  className="flex h-10 w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-fg-default"
                >
                  {CONTRACT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contractValue">Contract Value (ETB)</Label>
                <Input id="contractValue" name="contractValue" type="number" min={0} step={0.01} required placeholder="e.g. 85000000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientOrgId">Client Organization</Label>
                <select
                  id="clientOrgId"
                  name="clientOrgId"
                  required
                  className="flex h-10 w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-fg-default"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plannedStartDate">Planned Start Date</Label>
                <Input id="plannedStartDate" name="plannedStartDate" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plannedEndDate">Planned End Date</Label>
                <Input id="plannedEndDate" name="plannedEndDate" type="date" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consultantOrgId">Consultant Organization (optional)</Label>
              <select
                id="consultantOrgId"
                name="consultantOrgId"
                className="flex h-10 w-full rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-fg-default"
              >
                <option value="">None</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/projects")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}