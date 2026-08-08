"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function ContractsLegalDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="CONTRACTS_LEGAL"
      title="Contracts And Legal Dashboard"
      description="Variations, contract decisions, document control, claims evidence, and risk-to-claim traceability."
      metrics={[
        metric("pendingVariations", "Pending variations", "cost", "warn"),
        metric("documentsReview", "Documents under review", "documents", "warn"),
        metric("openRisks", "Open contractual risks", "risk", "warn"),
        metric("regulatoryReports", "Compliance exports", "reports", "good"),
      ]}
      queueTitle="Contracts Queue"
      queue={["pendingVariations", "documentsReview", "openRisks", "regulatoryReports"]}
      shortcuts={[
        makeShortcut("cost", "Variations", "Check contractor-side and consultant-side variation flow."),
        makeShortcut("documents", "Decisions and records", "Maintain controlled correspondence and rationale."),
        makeShortcut("risk", "Risk evidence", "Trace risks into stoppages and variations."),
      ]}
    />
  );
}
