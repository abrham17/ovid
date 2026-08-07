"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function SubcontractorDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="SUBCONTRACTOR_PM"
      title="Subcontractor PM Dashboard"
      description="Your contracted scope: active contracts, team activities, pending approvals, and scope deliverables."
      metrics={[
        metric("activeProjects", "Active contracts", undefined, "good"),
        metric("pendingDaily", "Daily reports awaiting approval", "dailies", "warn"),
        metric("pendingMeasurements", "Overdue measurements", "measurements", "warn"),
        metric("openDefects", "Open defects in your scope", "defects", "warn"),
      ]}
      queueTitle="Pending Items"
      queue={["pendingDaily", "pendingMeasurements", "openDefects", "pendingITRs", "pendingVariations"]}
      shortcuts={[
        { href: "/team", label: "Manage team", detail: "View and manage your subcontractor team members." },
        makeShortcut("dailies", "Daily reports", "Submit and approve daily site reports for your scope."),
        makeShortcut("measurements", "Measurements & IPCs", "Submit measurements and track IPC certifications."),
        makeShortcut("defects", "Defects & punch list", "Manage open defects and punch items in your scope."),
        makeShortcut("variations", "Variations", "Review and respond to variation requests."),
      ]}
    />
  );
}