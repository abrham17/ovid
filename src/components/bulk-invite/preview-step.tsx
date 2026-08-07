// components/bulk-invite/preview-step.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { BulkInviteController } from "./hooks/useBulkInvite";
import { Toolbar } from "./toolbar";
import { SpreadsheetEditor } from "./spreadsheet-editor";
import { ValidationSidebar } from "./validation-sidebar";

interface PreviewStepProps {
  controller: BulkInviteController;
}

export function PreviewStep({ controller }: PreviewStepProps) {
  const { summary, addManualRow, setStep, readyRows, rows } = controller;

  const canContinue = readyRows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Review & edit
          </h2>
          <p className="text-sm text-muted-foreground">
            Validate, fix issues, and apply batch assignments before sending.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addManualRow}
        >
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
        <div className="space-y-4 min-w-0">
          <Toolbar controller={controller} />
          <SpreadsheetEditor controller={controller} />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ValidationSidebar summary={summary} controller={controller} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep("import")}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {summary.errors > 0 && (
            <p className="text-xs text-muted-foreground">
              {summary.errors} row{summary.errors !== 1 ? "s" : ""} with errors
              will be skipped
            </p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canContinue}
            onClick={() => setStep("review")}
          >
            Continue to review
            {readyRows.length > 0 && (
              <span className="ml-1.5 tabular-nums opacity-80">
                ({readyRows.length})
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}