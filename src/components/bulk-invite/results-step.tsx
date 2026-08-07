// components/bulk-invite/results-step.tsx
"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Mail,
  SkipForward,
  Download,
  Copy,
  RotateCcw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import type { SendResult } from "./types";
import { downloadCsv, copyToClipboard } from "./lib/utils";

interface ResultsStepProps {
  controller: BulkInviteController;
}

function ResultCard({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", tone)} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-2xl font-semibold tabular-nums", tone)}>
        {count}
      </div>
    </div>
  );
}

export function ResultsStep({ controller }: ResultsStepProps) {
  const { results, reset } = controller;

  const grouped = useMemo(() => {
    if (!results) {
      return {
        sent: [] as SendResult[],
        already_registered: [] as SendResult[],
        already_invited: [] as SendResult[],
        failed: [] as SendResult[],
        skipped: [] as SendResult[],
      };
    }
    return {
      sent: results.filter((r) => r.code === "sent"),
      already_registered: results.filter((r) => r.code === "already_registered"),
      already_invited: results.filter((r) => r.code === "already_invited"),
      failed: results.filter((r) => r.code === "failed"),
      skipped: results.filter((r) => r.code === "skipped"),
    };
  }, [results]);

  if (!results) return null;

  const handleExport = () => {
    downloadCsv(
      `invitation-report-${new Date().toISOString().slice(0, 10)}.csv`,
      results.map((r) => ({
        email: r.email,
        fullName: r.fullName,
        status: r.code,
        message: r.message,
      }))
    );
    toast.success("Report downloaded");
  };

  const handleCopyFailed = async () => {
    const emails = grouped.failed.map((r) => r.email).join("\n");
    if (!emails) {
      toast.message("No failed emails to copy");
      return;
    }
    await copyToClipboard(emails);
    toast.success("Failed emails copied");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Invitation results
        </h2>
        <p className="text-sm text-muted-foreground">
          {grouped.sent.length} of {results.length} invitations sent successfully.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ResultCard
          icon={CheckCircle2}
          label="Sent"
          count={grouped.sent.length}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <ResultCard
          icon={UserCheck}
          label="Already registered"
          count={grouped.already_registered.length}
          tone="text-blue-600 dark:text-blue-400"
        />
        <ResultCard
          icon={Mail}
          label="Already invited"
          count={grouped.already_invited.length}
          tone="text-amber-600 dark:text-amber-400"
        />
        <ResultCard
          icon={XCircle}
          label="Failed"
          count={grouped.failed.length}
          tone="text-red-600 dark:text-red-400"
        />
        <ResultCard
          icon={SkipForward}
          label="Skipped"
          count={grouped.skipped.length}
          tone="text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={`${r.email}-${i}`}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {r.email}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.fullName || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        r.success
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                      )}
                    >
                      {r.code.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {r.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {grouped.failed.length > 0 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopyFailed}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy failed emails
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                // Re-import failed into a new batch would be ideal;
                // for now surface toast guidance
                toast.message("Copy failed emails, then start a new batch");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry failed
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <div className="flex-1" />
        <Button type="button" size="sm" className="gap-1.5" onClick={reset}>
          <Plus className="h-3.5 w-3.5" />
          Send another batch
        </Button>
      </div>
    </div>
  );
}