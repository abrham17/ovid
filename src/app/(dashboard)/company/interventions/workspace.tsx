"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { format } from "date-fns";

import {
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";

import type { ExecutiveInterventionRow } from "@/lib/types/general-manager";

// ==================================================
// TYPES
// ==================================================

type ResponseStatus =
  | "ACKNOWLEDGED"
  | "ACTION_IN_PROGRESS"
  | "READY_FOR_REVIEW";

type NextAction = {
  status: ResponseStatus;
  label: string;
};

// ==================================================
// NEXT ACTIONS
// ==================================================

const nextActions: Record<
  string,
  NextAction[]
> = {
  OPEN: [
    {
      status: "ACKNOWLEDGED",
      label: "Acknowledge",
    },
  ],

  ACKNOWLEDGED: [
    {
      status: "ACTION_IN_PROGRESS",
      label: "Start corrective action",
    },
  ],

  ACTION_IN_PROGRESS: [
    {
      status: "READY_FOR_REVIEW",
      label: "Submit for CEO review",
    },
  ],

  READY_FOR_REVIEW: [
    {
      status: "ACTION_IN_PROGRESS",
      label: "Resume corrective action",
    },
  ],
};

// ==================================================
// BADGE VARIANT
// ==================================================

function badgeVariant(priority: string) {
  if (priority === "CRITICAL") {
    return "destructive" as const;
  }

  if (priority === "HIGH") {
    return "warning" as const;
  }

  return "secondary" as const;
}

// ==================================================
// COMPONENT
// ==================================================

export function ExecutiveActionsWorkspace({
  currentUserId,
}: {
  currentUserId: string;
}) {
  // ==================================================
  // STATE
  // ==================================================

  const [rows, setRows] = useState<
    ExecutiveInterventionRow[]
  >([]);

  const [comments, setComments] = useState<
    Record<string, string>
  >({});

  const [expanded, setExpanded] =
    useState<string>();

  const [busy, setBusy] =
    useState<string>();

  const [message, setMessage] =
    useState<string>();

  // ==================================================
  // LOAD INTERVENTIONS
  // ==================================================

  const load = useCallback(async () => {
    const response = await fetch(
      "/api/company/interventions",
      {
        cache: "no-store",
      }
    );

    const body = await response.json();

    if (body.success) {
      setRows(body.data);
    } else {
      setMessage(body.error);
    }
  }, []);

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    void load();
  }, [load]);

  // ==================================================
  // FILTER ASSIGNED ACTIONS
  // ==================================================

  const assigned = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.accountableUser.id ===
          currentUserId
      ),
    [currentUserId, rows]
  );

  // ==================================================
  // RESPOND TO INTERVENTION
  // ==================================================

  async function respond(
    interventionId: string,
    status: ResponseStatus
  ) {
    const comment =
      comments[interventionId]?.trim();

    // ----------------------------------------------
    // Require a management response
    // ----------------------------------------------

    if (!comment) {
      setMessage(
        "A management response is required before changing status."
      );

      return;
    }

    // ----------------------------------------------
    // Mark request as busy
    // ----------------------------------------------

    setBusy(interventionId);
    setMessage(undefined);

    // ----------------------------------------------
    // Submit response
    // ----------------------------------------------

    const response = await fetch(
      "/api/company/interventions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          interventionId,
          status,
          comment,
        }),
      }
    );

    const body = await response.json();

    // ----------------------------------------------
    // Clear busy state
    // ----------------------------------------------

    setBusy(undefined);

    // ----------------------------------------------
    // Handle error
    // ----------------------------------------------

    if (!body.success) {
      setMessage(body.error);
      return;
    }

    // ----------------------------------------------
    // Clear comment
    // ----------------------------------------------

    setComments((current) => ({
      ...current,
      [interventionId]: "",
    }));

    // ----------------------------------------------
    // Success message
    // ----------------------------------------------

    setMessage(
      "Management response recorded in the immutable action history."
    );

    // ----------------------------------------------
    // Reload data
    // ----------------------------------------------

    await load();
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <PageHeader
        title="Executive Actions"
        description="Corrective actions assigned to you by the General Manager"
      />

      {/* ==================================================
          MESSAGE
          ================================================== */}

      {message && (
        <p className="rounded-md border border-border-default bg-surface-raised px-3 py-2 text-sm text-fg-muted">
          {message}
        </p>
      )}

      {/* ==================================================
          SUMMARY CARDS
          ================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">

        {/* --------------------------------------------------
            OPEN ASSIGNMENTS
            -------------------------------------------------- */}

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ListChecks className="h-5 w-5 text-primary" />

            <div>
              <p className="text-2xl font-semibold">
                {
                  assigned.filter(
                    (row) =>
                      ![
                        "CLOSED",
                        "CANCELLED",
                      ].includes(row.status)
                  ).length
                }
              </p>

              <p className="text-xs text-fg-muted">
                Open assignments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* --------------------------------------------------
            OVERDUE
            -------------------------------------------------- */}

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock3 className="h-5 w-5 text-warning" />

            <div>
              <p className="text-2xl font-semibold">
                {
                  assigned.filter(
                    (row) =>
                      ![
                        "CLOSED",
                        "CANCELLED",
                      ].includes(row.status) &&
                      new Date(row.dueAt) <
                        new Date()
                  ).length
                }
              </p>

              <p className="text-xs text-fg-muted">
                Overdue
              </p>
            </div>
          </CardContent>
        </Card>

        {/* --------------------------------------------------
            AWAITING CEO REVIEW
            -------------------------------------------------- */}

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />

            <div>
              <p className="text-2xl font-semibold">
                {
                  assigned.filter(
                    (row) =>
                      row.status ===
                      "READY_FOR_REVIEW"
                  ).length
                }
              </p>

              <p className="text-xs text-fg-muted">
                Awaiting CEO review
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================================================
          EMPTY STATE
          ================================================== */}

      {assigned.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-fg-muted">
            No executive corrective actions are
            assigned to you.
          </CardContent>
        </Card>
      )}

      {/* ==================================================
          ASSIGNED ACTIONS
          ================================================== */}

      <div className="space-y-4">
        {assigned.map((row) => (
          <Card key={row.id}>

            {/* ==================================================
                ACTION HEADER
                ================================================== */}

            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">

                {/* Status badges */}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={badgeVariant(
                      row.priority
                    )}
                  >
                    {row.priority}
                  </Badge>

                  <Badge variant="outline">
                    {row.category.replaceAll(
                      "_",
                      " "
                    )}
                  </Badge>

                  <Badge variant="secondary">
                    {row.status.replaceAll(
                      "_",
                      " "
                    )}
                  </Badge>
                </div>

                {/* Title */}

                <CardTitle className="text-base">
                  {row.project.code} -{" "}
                  {row.title}
                </CardTitle>

                {/* Due date */}

                <p className="text-xs text-fg-muted">
                  Due{" "}
                  {format(
                    new Date(row.dueAt),
                    "dd MMM yyyy"
                  )}{" "}
                  - directed by{" "}
                  {row.createdBy.fullName}
                </p>
              </div>
            </CardHeader>

            {/* ==================================================
                ACTION CONTENT
                ================================================== */}

            <CardContent className="space-y-4">

              {/* ==================================================
                  CONCERN AND REQUIRED RESULT
                  ================================================== */}

              <div className="grid gap-4 md:grid-cols-2">

                {/* Executive concern */}

                <div>
                  <p className="text-xs font-semibold uppercase text-fg-subtle">
                    Executive concern
                  </p>

                  <p className="mt-1 text-sm text-fg-muted">
                    {row.description}
                  </p>
                </div>

                {/* Required result */}

                <div>
                  <p className="text-xs font-semibold uppercase text-fg-subtle">
                    Required result
                  </p>

                  <p className="mt-1 text-sm text-fg-default">
                    {row.requiredAction}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  STATUS ACTIONS
                  ================================================== */}

              {nextActions[row.status]?.length >
                0 && (
                <div className="space-y-2 border-t border-border-default pt-4">

                  {/* Management response */}

                  <Textarea
                    value={
                      comments[row.id] ?? ""
                    }
                    onChange={(event) =>
                      setComments(
                        (current) => ({
                          ...current,
                          [row.id]:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Record progress, evidence references, blockers, and the corrective result"
                  />

                  {/* Action buttons */}

                  <div className="flex flex-wrap gap-2">
                    {nextActions[
                      row.status
                    ].map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        disabled={
                          busy === row.id
                        }
                        onClick={() =>
                          void respond(
                            row.id,
                            action.status
                          )
                        }
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================
                  HISTORY TOGGLE
                  ================================================== */}

              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() =>
                  setExpanded(
                    expanded === row.id
                      ? undefined
                      : row.id
                  )
                }
              >
                <History className="h-4 w-4" />

                {expanded === row.id
                  ? "Hide history"
                  : `View history (${row.events.length})`}
              </Button>

              {/* ==================================================
                  ACTION HISTORY
                  ================================================== */}

              {expanded === row.id && (
                <div className="space-y-3 border-l-2 border-border-default pl-4">
                  {row.events.map((event) => (
                    <div key={event.id}>

                      {/* Event title */}

                      <p className="text-sm font-medium">
                        {event.type.replaceAll(
                          "_",
                          " "
                        )}{" "}
                        -{" "}
                        {event.author.fullName}
                      </p>

                      {/* Status transition */}

                      <p className="text-xs text-fg-muted">
                        {format(
                          new Date(
                            event.createdAt
                          ),
                          "dd MMM yyyy, HH:mm"
                        )}{" "}
                        -{" "}
                        {event.oldStatus ??
                          "NEW"}{" "}
                        to{" "}
                        {event.newStatus ??
                          row.status}
                      </p>

                      {/* Comment */}

                      <p className="mt-1 text-sm text-fg-muted">
                        {event.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}