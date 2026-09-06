"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";

const ROLES = [
  "GENERAL_MANAGER",
  "LEGAL_SERVICE_MANAGER",
  "HEAD_TENDERING",
  "TENDERING_OFFICER",
  "HEAD_PLANNING_MONITORING",
  "PLANNING_OFFICER",
  "ENGINEERING_DEPT_MANAGER",
  "HEAD_ENGINEERING_SERVICES",
  "ENGINEERING_SERVICES_OFFICER",
  "EQUIPMENT_ADMIN_MANAGER",
  "FINANCE_DEPT_MANAGER",
  "INTERNAL_AUDITOR",
];

interface CompanyStaffManagerProps {
  initialAssignments: any[];
  initialInvitations: any[];
  organizationUsers: any[];
}

export function CompanyStaffManager({
  initialAssignments,
  initialInvitations,
  organizationUsers,
}: CompanyStaffManagerProps) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [result, setResult] = useState<string>();

  // --------------------------------------------------
  // Invite a new company staff member
  // --------------------------------------------------

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "invite",
        email: form.get("email"),
        fullName: form.get("fullName"),
        jobTitle: form.get("jobTitle"),
        role: form.get("role"),
      }),
    });

    const data = await response.json();

    if (data.success) {
      if (data.data.token) {
        setResult(
          `${location.origin}/accept-invite/${data.data.token}`
        );
      } else {
        setResult(data.data.status);
      }
    } else {
      setResult(data.error);
    }
  }

  // --------------------------------------------------
  // Deactivate an existing assignment
  // --------------------------------------------------

  async function deactivate(id: string) {
    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deactivate",
        assignmentId: id,
        reason: "Administrative change",
      }),
    });

    if (response.ok) {
      setAssignments((currentAssignments) =>
        currentAssignments.map((assignment) =>
          assignment.id === id
            ? {
                ...assignment,
                active: false,
              }
            : assignment
        )
      );
    }
  }

  // --------------------------------------------------
  // Reactivate a previously deactivated assignment
  // --------------------------------------------------

  async function reactivate(id: string) {
    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "reactivate",
        assignmentId: id,
        reason: "Role holder returned to active duty",
      }),
    });

    const data = await response.json();

    if (data.success) {
      setResult(
        "Role reactivated with a new historical assignment record"
      );

      location.reload();
    } else {
      setResult(data.error);
    }
  }

  // --------------------------------------------------
  // Handle invitation actions
  // --------------------------------------------------

  async function invitationAction(
    action: string,
    invitationId: string
  ) {
    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        invitationId,
      }),
    });

    const data = await response.json();

    if (data.success && data.data?.token) {
      setResult(
        `${location.origin}/accept-invite/${data.data.token}`
      );
    } else if (data.success) {
      setResult("Invitation updated");
    } else {
      setResult(data.error);
    }

    if (action === "revoke-invitation" && data.success) {
      location.reload();
    }
  }

  // --------------------------------------------------
  // Assign a role to an existing organization user
  // --------------------------------------------------

  async function assign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: form.get("userId"),
        role: form.get("role"),
        reason: form.get("reason"),
      }),
    });

    const data = await response.json();

    if (data.success) {
      setResult("Role assigned");
      location.reload();
    } else {
      setResult(data.error);
    }
  }

  // --------------------------------------------------
  // Replace an existing role holder
  // --------------------------------------------------

  async function replace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const response = await fetch("/api/company/staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "replace",
        assignmentId: form.get("assignmentId"),
        replacementUserId: form.get("replacementUserId"),
        reason: form.get("reason"),
      }),
    });

    const data = await response.json();

    if (data.success) {
      setResult(
        "Assignment replaced; former history was preserved"
      );

      location.reload();
    } else {
      setResult(data.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Company Staff"
        description="ADMIN-only company role administration"
      />

      {/* ==================================================
          INVITE COMPANY STAFF
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>Invite company staff</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={invite}
            className="grid gap-3 md:grid-cols-2"
          >
            <div>
              <Label>Full name</Label>

              <Input
                name="fullName"
                required
              />
            </div>

            <div>
              <Label>Email</Label>

              <Input
                name="email"
                type="email"
                required
              />
            </div>

            <div>
              <Label>Job title</Label>

              <Input
                name="jobTitle"
                required
              />
            </div>

            <div>
              <Label>Company role</Label>

              <select
                name="role"
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                {ROLES.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit">
              Create invitation
            </Button>

            {result && (
              <p className="break-all text-xs">
                {result}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ==================================================
          ASSIGN EXISTING ORGANIZATION USER
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Assign an existing organization user
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={assign}
            className="grid gap-3 md:grid-cols-3"
          >
            <div>
              <Label>User</Label>

              <select
                name="userId"
                required
                className="h-10 w-full rounded-md border px-3"
              >
                <option value="">
                  Select user…
                </option>

                {organizationUsers.map((user: any) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.fullName} · {user.jobTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Role</Label>

              <select
                name="role"
                className="h-10 w-full rounded-md border px-3"
              >
                {ROLES.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Reason</Label>

              <Input
                name="reason"
                required
              />
            </div>

            <Button type="submit">
              Assign role
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ==================================================
          REPLACE ROLE HOLDER
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Replace a role holder
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={replace}
            className="grid gap-3 md:grid-cols-3"
          >
            <div>
              <Label>Current assignment</Label>

              <select
                name="assignmentId"
                required
                className="h-10 w-full rounded-md border px-3"
              >
                <option value="">
                  Select active assignment…
                </option>

                {assignments
                  .filter((assignment) => assignment.active)
                  .map((assignment) => (
                    <option
                      key={assignment.id}
                      value={assignment.id}
                    >
                      {assignment.role} ·{" "}
                      {assignment.user.fullName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label>Replacement</Label>

              <select
                name="replacementUserId"
                required
                className="h-10 w-full rounded-md border px-3"
              >
                <option value="">
                  Select replacement…
                </option>

                {organizationUsers.map((user: any) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Reason</Label>

              <Input
                name="reason"
                required
              />
            </div>

            <Button type="submit">
              Replace holder
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ==================================================
          ASSIGNMENT HISTORY
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Assignment history
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <b>
                  {assignment.user.fullName}
                </b>

                <p className="text-xs">
                  {assignment.role} ·{" "}
                  {assignment.user.email} ·{" "}
                  {assignment.active
                    ? "Active"
                    : `Ended ${
                        assignment.endedAt
                          ? new Date(
                              assignment.endedAt
                            ).toLocaleDateString()
                          : ""
                      }`}
                </p>

                <p className="text-xs text-fg-muted">
                  Assigned by{" "}
                  {assignment.assignedBy?.fullName ??
                    "bootstrap"}

                  {assignment.reason
                    ? ` · ${assignment.reason}`
                    : ""}
                </p>
              </div>

              {assignment.active ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    deactivate(assignment.id)
                  }
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    reactivate(assignment.id)
                  }
                >
                  Reactivate
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ==================================================
          INVITATION HISTORY
          ================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>
            Invitation history
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {initialInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <b>
                  {invitation.fullName}
                </b>

                <p className="text-xs">
                  {invitation.role} ·{" "}
                  {invitation.email} ·{" "}
                  {invitation.status}
                </p>
              </div>

              {invitation.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      void invitationAction(
                        "resend-invitation",
                        invitation.id
                      )
                    }
                  >
                    Resend
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      void invitationAction(
                        "revoke-invitation",
                        invitation.id
                      )
                    }
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}