"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function QsDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="QS"
      title="QS Dashboard"
      description="BoQ baseline, measured quantities, IPC status, variations, and commercial evidence."
      metrics={[
        metric("submittedMeasurements", "Submitted IPC measurements", "cost", "warn"),
        metric("certifiedPayments", "Certified payments", "cost", "good"),
        metric("pendingVariations", "Pending variations", "cost", "warn"),
        metric("openRisks", "Open commercial risks", "risk", "warn"),
      ]}
      queueTitle="Commercial Queue"
      queue={["submittedMeasurements", "certifiedPayments", "pendingVariations", "openRisks"]}
      shortcuts={[
        makeShortcut("cost", "Cost and IPC", "Manage BoQ, actuals, measurements, and payments."),
        makeShortcut("risk", "Commercial risks", "Track risk exposure affecting cost and time."),
        makeShortcut("reports", "Payment exports", "Prepare reporting for certified quantities."),
      ]}
    />
  );
}
