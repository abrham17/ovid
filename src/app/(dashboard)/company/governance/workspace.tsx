"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

import type {
  CompanyContextPayload,
  CompanyRole,
} from "@/lib/types/company";

// ==================================================
// TYPES
// ==================================================

type DesignRow = {
  id: string;
  title: string;
  documentRef: string;
  reviewType: string;
  safetyCritical: boolean;
  status: string;

  project: {
    code: string;
    name: string;
  };

  submittedBy: {
    fullName: string;
  };

  resolution: string | null;
};

type LegalRow = {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;

  project: {
    code: string;
    name: string;
  };

  disputedBy: {
    fullName: string;
  };
};

type FindingRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  dueAt: string | null;

  project: {
    code: string;
    name: string;
  } | null;

  owner: {
    fullName: string;
  } | null;
};

// ==================================================
// COMPONENT
// ==================================================

export function CompanyGovernanceWorkspace({
  roles,
}: {
  roles: CompanyRole[];
}) {
  // ==================================================
  // STATE
  // ==================================================

  const [design, setDesign] = useState<
    DesignRow[]
  >([]);

  const [legal, setLegal] = useState<
    LegalRow[]
  >([]);

  const [findings, setFindings] = useState<
    FindingRow[]
  >([]);

  const [context, setContext] =
    useState<CompanyContextPayload>({
      organizations: [],
      projects: [],
      users: [],
    });

  const [message, setMessage] =
    useState<string>();

  // ==================================================
  // ROLE PERMISSIONS
  // ==================================================

  const canEngineering = roles.some((role) =>
    [
      "HEAD_ENGINEERING_SERVICES",
      "ENGINEERING_SERVICES_OFFICER",
      "ENGINEERING_DEPT_MANAGER",
    ].includes(role)
  );

  const canLegal = roles.includes(
    "LEGAL_SERVICE_MANAGER"
  );

  const isAuditor = roles.includes(
    "INTERNAL_AUDITOR"
  );

  const isGeneralManager = roles.includes(
    "GENERAL_MANAGER"
  );

  // ==================================================
  // LOAD GOVERNANCE DATA
  // ==================================================

  const load = useCallback(() => {
    // ----------------------------------------------
    // Design reviews
    // ----------------------------------------------

    if (canEngineering) {
      fetch(
        "/api/company/governance?kind=design"
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setDesign(data.data);
          }
        });
    }

    // ----------------------------------------------
    // Legal disputes
    // ----------------------------------------------

    if (canLegal) {
      fetch(
        "/api/company/governance?kind=legal"
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setLegal(data.data);
          }
        });
    }

    // ----------------------------------------------
    // Audit findings
    // ----------------------------------------------

    if (isAuditor || isGeneralManager) {
      fetch(
        "/api/company/governance?kind=audit"
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setFindings(data.data);
          }
        });
    }

    // ----------------------------------------------
    // Company context
    // ----------------------------------------------

    fetch("/api/company/context")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setContext(data.data);
        }
      });
  }, [
    canEngineering,
    canLegal,
    isAuditor,
    isGeneralManager,
  ]);

  // ==================================================
  // INITIAL DATA LOAD
  // ==================================================

  useEffect(() => {
    load();
  }, [load]);

  // ==================================================
  // GENERIC POST REQUEST
  // ==================================================

  async function post(body: unknown) {
    const response = await fetch(
      "/api/company/governance",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (data.success) {
      setMessage("Saved");

      load();
    } else {
      setMessage(data.error);
    }
  }

  // ==================================================
  // CREATE AUDIT FINDING
  // ==================================================

  async function submitFinding(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(
      e.currentTarget
    );

    await post({
      action: "create-finding",
      ...Object.fromEntries(formData),
    });
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <PageHeader
        title="Company Governance"
        description="Engineering reviews, legal escalations, and internal-audit findings"
      />

      {/* ==================================================
          STATUS MESSAGE
          ================================================== */}

      {message && (
        <p className="text-sm">
          {message}
        </p>
      )}

      {/* ==================================================
          ENGINEERING DESIGN REVIEWS
          ================================================== */}

      {canEngineering && (
        <Card>
          <CardHeader>
            <CardTitle>
              Design quality and safety reviews
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {design.map((row) => (
              <div
                key={row.id}
                className="rounded border p-3"
              >
                {/* Review title */}

                <b>
                  {row.project.code} ·{" "}
                  {row.title}
                </b>

                {/* Review details */}

                <p className="text-xs">
                  {row.documentRef} ·{" "}
                  {row.reviewType} ·{" "}
                  {row.safetyCritical
                    ? "Safety critical"
                    : "Quality review"}{" "}
                  · {row.status}
                </p>

                {/* Review actions */}

                {row.status === "SUBMITTED" &&
                  roles.some((role) =>
                    [
                      "HEAD_ENGINEERING_SERVICES",
                      "ENGINEERING_DEPT_MANAGER",
                    ].includes(role)
                  ) && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void post({
                            action:
                              "review-design",
                            reviewId: row.id,
                            decision:
                              "APPROVED",
                            resolution:
                              "Approved for use",
                          })
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void post({
                            action:
                              "review-design",
                            reviewId: row.id,
                            decision:
                              "CHANGES_REQUIRED",
                            resolution:
                              "Resolve recorded design findings",
                          })
                        }
                      >
                        Require changes
                      </Button>
                    </div>
                  )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ==================================================
          LEGAL DISPUTES
          ================================================== */}

      {canLegal && (
        <Card>
          <CardHeader>
            <CardTitle>
              Contentious disputes
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {legal.map((row) => (
              <div
                key={row.id}
                className="rounded border p-3"
              >
                {/* Dispute summary */}

                <b>
                  {row.project.code} ·{" "}
                  {row.status}
                </b>

                {/* Dispute details */}

                <p className="text-xs">
                  {row.reason} · opened by{" "}
                  {row.disputedBy.fullName}
                </p>

                {/* Legal actions */}

                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      void post({
                        action:
                          "review-legal",
                        disputeId: row.id,
                        status:
                          "UNDER_REVIEW",
                        resolution:
                          "Under company legal review",
                      })
                    }
                  >
                    Take review
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void post({
                        action:
                          "review-legal",
                        disputeId: row.id,
                        status:
                          "RESOLVED",
                        resolution:
                          "Resolved by company legal escalation",
                      })
                    }
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ==================================================
          AUDIT FINDINGS AND REMEDIATION
          ================================================== */}

      {(isAuditor || isGeneralManager) && (
        <Card>
          <CardHeader>
            <CardTitle>
              Audit findings and remediation
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* ==================================================
                CREATE FINDING
                ================================================== */}

            {isAuditor && (
              <form
                onSubmit={submitFinding}
                className="grid gap-2 md:grid-cols-3"
              >
                {/* Project */}

                <select
                  name="projectId"
                  className="rounded border px-2"
                >
                  <option value="">
                    Portfolio-wide
                  </option>

                  {context.projects.map(
                    (project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.code} ·{" "}
                        {project.name}
                      </option>
                    )
                  )}
                </select>

                {/* Finding title */}

                <Input
                  name="title"
                  placeholder="Finding title"
                  required
                />

                {/* Finding description */}

                <Input
                  name="description"
                  placeholder="Finding description"
                  required
                />

                {/* Severity */}

                <select
                  name="severity"
                  className="rounded border px-2"
                >
                  <option value="LOW">
                    LOW
                  </option>

                  <option value="MEDIUM">
                    MEDIUM
                  </option>

                  <option value="HIGH">
                    HIGH
                  </option>

                  <option value="CRITICAL">
                    CRITICAL
                  </option>
                </select>

                {/* Evidence reference */}

                <Input
                  name="evidenceRef"
                  placeholder="Evidence reference"
                />

                {/* Due date */}

                <Input
                  name="dueAt"
                  type="date"
                />

                {/* Owner */}

                <select
                  name="ownerId"
                  className="rounded border px-2"
                >
                  <option value="">
                    No owner
                  </option>

                  {context.users.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                    >
                      {user.fullName}
                    </option>
                  ))}
                </select>

                {/* Submit */}

                <Button type="submit">
                  Raise finding
                </Button>
              </form>
            )}

            {/* ==================================================
                FINDINGS LIST
                ================================================== */}

            {findings.map((row) => (
              <div
                key={row.id}
                className="rounded border p-3"
              >
                {/* Finding title */}

                <b>
                  {row.severity} ·{" "}
                  {row.title}
                </b>

                {/* Finding details */}

                <p className="text-xs">
                  {row.project?.code ??
                    "Portfolio"}{" "}
                  · {row.status} · owner{" "}
                  {row.owner?.fullName ??
                    "Unassigned"}

                  {row.dueAt
                    ? ` · due ${row.dueAt.slice(
                        0,
                        10
                      )}`
                    : ""}
                </p>

                {/* Finding actions */}

                {isAuditor &&
                  row.status !== "CLOSED" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void post({
                            action:
                              "update-finding",
                            findingId:
                              row.id,
                            status:
                              "REMEDIATION_IN_PROGRESS",
                          })
                        }
                      >
                        Remediation started
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void post({
                            action:
                              "update-finding",
                            findingId:
                              row.id,
                            status:
                              "CLOSED",
                          })
                        }
                      >
                        Verify and close
                      </Button>
                    </div>
                  )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}