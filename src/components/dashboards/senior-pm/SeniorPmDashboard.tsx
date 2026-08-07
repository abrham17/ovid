"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function SeniorPmDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="SENIOR_PM"
      title="Senior PM Dashboard"
      description="Executive project health, critical approvals, variance pressure, and portfolio-wide delivery control."
      metrics={[
        metric("overallProgress", "Overall project progress", undefined, "good"),
        metric("overdueActivities", "Overdue activities", "schedule", "warn"),
        metric("pendingReviews", "Pending reviews", "reviews", "warn"),
        metric("activeSubcontractors", "Active subcontractors", "subcontractors", "good"),
        metric("pendingInspections", "Pending inspections", "inspections", "warn"),
      ]}
      queueTitle="Approval Queue"
      queue={["overallProgress", "overdueActivities", "pendingReviews", "activeSubcontractors", "pendingInspections"]}
      shortcuts={[
        { href: "/team", label: "Invite team", detail: "Send email invitations for site and office roles." },
        makeShortcut("progress", "Project progress", "Track overall schedule, milestones, and deliverables."),
        makeShortcut("overview", "Project health", "Scan schedule, cost, risk, safety, and quality."),
        makeShortcut("cost", "Commercial approvals", "Review IPCs, payments, and variations."),
        makeShortcut("reports", "Compliance reports", "Generate executive and regulatory exports."),
      ]}
    />
  );
}