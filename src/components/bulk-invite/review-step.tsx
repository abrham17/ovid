// components/bulk-invite/review-step.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  FolderKanban,
  Users,
  Mail,
  AlertTriangle,
  XCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import type { InviteRow } from "./types";

interface ReviewStepProps {
  controller: BulkInviteController;
  onConfirm: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${tone ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

export function ReviewStep({ controller, onConfirm }: ReviewStepProps) {
  const { readyRows, summary, organizations, projects, setStep } = controller;
  const [confirmed, setConfirmed] = useState(false);

  const roleBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of readyRows) {
      map.set(row.role, (map.get(row.role) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [readyRows]);

  const orgBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of readyRows) {
      const name =
        organizations.find((o) => o.id === row.organizationId)?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [readyRows, organizations]);

  const projectCount = useMemo(() => {
    const set = new Set(readyRows.filter((r) => r.projectId).map((r) => r.projectId));
    return set.size;
  }, [readyRows]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Review before sending
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirm the batch details. Invitations cannot be undone once sent.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Mail}
          label="Invitations"
          value={readyRows.length}
        />
        <StatCard
          icon={Building2}
          label="Organizations"
          value={orgBreakdown.length}
        />
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={projectCount}
        />
        <StatCard
          icon={Users}
          label="Roles"
          value={roleBreakdown.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Role breakdown
          </h3>
          <ul className="space-y-2">
            {roleBreakdown.map(([role, count]) => (
              <li
                key={role}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {ROLE_LABELS[role as InviteRow["role"]] ?? role}
                </span>
                <span className="font-medium tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organizations
          </h3>
          <ul className="space-y-2">
            {orgBreakdown.map(([name, count]) => (
              <li
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground truncate">{name}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(summary.errors > 0 || summary.warnings > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Attention
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {summary.errors > 0 && (
              <li className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                {summary.errors} row{summary.errors !== 1 ? "s" : ""} with errors
                will be skipped
              </li>
            )}
            {summary.warnings > 0 && (
              <li className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                {summary.warnings} row{summary.warnings !== 1 ? "s" : ""} have
                warnings and will still be sent
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <Checkbox
          id="confirm-send"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="confirm-send"
          className="text-sm leading-relaxed cursor-pointer"
        >
          I confirm that these {readyRows.length} invitation
          {readyRows.length !== 1 ? "s" : ""} should be sent. Invitees will
          receive an email with a link to create their account.
        </Label>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep("preview")}
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!confirmed || readyRows.length === 0}
          onClick={onConfirm}
        >
          Send {readyRows.length} invitation{readyRows.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}