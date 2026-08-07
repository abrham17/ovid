// components/bulk-invite/progress-tracker.tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "./types";

const STEPS = [
  { id: "import", label: "Import", description: "Add people" },
  { id: "preview", label: "Edit", description: "Validate & assign" },
  { id: "review", label: "Review", description: "Confirm batch" },
  { id: "results", label: "Results", description: "Delivery report" },
] as const;

type TrackerStepId = (typeof STEPS)[number]["id"];

function resolveActiveIndex(step: WizardStep): number {
  switch (step) {
    case "import":
      return 0;
    case "preview":
    case "validation":
    case "assignment":
      return 1;
    case "review":
    case "sending":
      return 2;
    case "results":
      return 3;
    default:
      return 0;
  }
}

interface ProgressTrackerProps {
  current: WizardStep;
  className?: string;
}

export function ProgressTracker({ current, className }: ProgressTrackerProps) {
  const activeIdx = resolveActiveIndex(current);

  return (
    <nav aria-label="Invitation progress" className={cn("w-full", className)}>
      {/* Desktop */}
      <ol className="hidden sm:flex items-center">
        {STEPS.map((step, idx) => {
          const done = idx < activeIdx;
          const active = idx === activeIdx;
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200",
                    done && "bg-primary text-primary-foreground",
                    active &&
                      "bg-primary text-primary-foreground ring-[3px] ring-primary/25",
                    !done && !active && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <span className="tabular-nums">{idx + 1}</span>
                  )}
                </div>
                <div className="text-center min-w-0">
                  <div
                    className={cn(
                      "text-xs font-medium truncate",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="hidden lg:block text-[11px] text-muted-foreground/80 truncate">
                    {step.description}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 min-w-[16px] max-w-[80px] transition-colors duration-300",
                    idx < activeIdx ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {STEPS[activeIdx]?.label}
          </span>
          <span className="tabular-nums text-muted-foreground">
            Step {activeIdx + 1} of {STEPS.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                idx < activeIdx && "bg-primary",
                idx === activeIdx && "bg-primary",
                idx > activeIdx && "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {STEPS[activeIdx]?.description}
        </p>
      </div>
    </nav>
  );
}

export { STEPS as PROGRESS_STEPS };
export type { TrackerStepId };