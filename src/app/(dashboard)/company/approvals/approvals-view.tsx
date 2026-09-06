"use client";

import { useEffect, useState } from "react";

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
  CompanyApprovalRow,
  CompanyContextPayload,
} from "@/lib/types/company";

export function CompanyApprovals() {
  const [rows, setRows] = useState<CompanyApprovalRow[]>([]);

  const [context, setContext] =
    useState<CompanyContextPayload>({
      projects: [],
      organizations: [],
      users: [],
    });

  const [error, setError] = useState<string>();

  // --------------------------------------------------
  // Load company approvals and company context
  // --------------------------------------------------

  useEffect(() => {
    fetch("/api/company/approvals")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setRows(data.data);
        } else {
          setError(data.error);
        }
      });

    fetch("/api/company/context")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setContext(data.data);
        }
      });
  }, []);

  // --------------------------------------------------
  // Review an approval request
  // --------------------------------------------------

  async function review(
    id: string,
    approved: boolean
  ) {
    const response = await fetch(
      "/api/company/approvals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "review",
          approvalId: id,
          approved,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      location.reload();
    } else {
      setError(data.error);
    }
  }

  // --------------------------------------------------
  // Propose contractor onboarding
  // --------------------------------------------------

  async function onboarding(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const response = await fetch(
      "/api/company/onboarding",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Object.fromEntries(formData)
        ),
      }
    );

    const data = await response.json();

    if (data.success) {
      location.reload();
    } else {
      setError(data.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <PageHeader
        title="Company Approvals"
        description="Organization-wide governance queue"
      />

      {/* ==================================================
          ERROR MESSAGE
          ================================================== */}

      {error && (
        <p className="text-sm text-danger">
          {error}
        </p>
      )}

      {/* ==================================================
          CONTRACTOR ONBOARDING
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Propose contractor onboarding
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={onboarding} className="grid gap-2 md:grid-cols-3">
            {/* Project */}

            <select name="projectId" required className="rounded border px-2">
              <option value="">
                Project…
              </option>

              {context.projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.code} · {project.name}
                </option>
              ))}
            </select>

            {/* Contractor */}

            <select
              name="contractorOrgId"
              required
              className="rounded border px-2"
            >
              <option value="">
                Contractor…
              </option>

              {context.organizations
                .filter((organization) =>
                  [
                    "SUBCONTRACTOR",
                    "CONTRACTOR",
                  ].includes(
                    organization.partyType
                  )
                )
                .map((organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name}
                  </option>
                ))}
            </select>

            {/* PM Email */}

            <Input
              name="email"
              type="email"
              placeholder="PM email"
              required
            />

            {/* Full Name */}

            <Input
              name="fullName"
              placeholder="Full name"
              required
            />

            {/* Job Title */}

            <Input
              name="jobTitle"
              placeholder="Job title"
              required
            />

            {/* Role */}

            <select
              name="role"
              className="rounded border px-2"
            >
              <option>
                SUBCONTRACTOR_PM
              </option>

              <option>
                SENIOR_PM
              </option>

              <option>
                DEPUTY_PM
              </option>

              <option>
                OFFICE_ENGINEER
              </option>
            </select>

            {/* Submit */}

            <Button type="submit">
              Send for GM approval
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ==================================================
          APPROVAL QUEUE
          ================================================== */}

      <div className="space-y-3">
        {rows.map((approval) => (
          <Card key={approval.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {approval.type.replaceAll(
                  "_",
                  " "
                )}{" "}
                · {approval.status}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex items-center justify-between">
              {/* Approval information */}

              <p className="text-xs">
                {approval.entityType} /{" "}
                {approval.entityId}

                <br />

                Requested by{" "}
                {approval.requestedBy?.fullName}
              </p>

              {/* Approval actions */}

              {approval.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      void review(
                        approval.id,
                        true
                      )
                    }
                  >
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void review(
                        approval.id,
                        false
                      )
                    }
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}