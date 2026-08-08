"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function HseOfficerDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="HSE_OFFICER"
      title="HSE Officer Dashboard"
      description="Hazards, incidents, corrective-action closeout, and activities blocked for safety."
      metrics={[
        metric("openIncidents", "Open incidents", "safety", "bad"),
        metric("openRisks", "HSE-related risk pressure", "risk", "warn"),
        metric("documentsReview", "Safety docs under review", "documents", "warn"),
        metric("regulatoryReports", "Regulatory exports", "reports", "good"),
      ]}
      queueTitle="Safety Queue"
      queue={["openIncidents", "openRisks", "documentsReview", "regulatoryReports"]}
      shortcuts={[
        makeShortcut("safety", "Incident closeout", "Verify corrective action and safety blockers."),
        makeShortcut("risk", "Risk register", "Escalate safety risks before they realize."),
        makeShortcut("reports", "Safety compliance", "Generate compliance submissions."),
      ]}
    />
  );
}
