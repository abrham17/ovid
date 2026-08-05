import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function SeniorPmDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="SENIOR_PM"
      title="Senior PM Dashboard"
      description="Executive project health, critical approvals, variance pressure, and portfolio-wide delivery control."
      metrics={[
        metric("projects", "Visible projects", undefined, "good"),
        metric("openRisks", "Open risks", "risk", "warn"),
        metric("pendingVariations", "Pending variations", "cost", "warn"),
        metric("certifiedPayments", "Certified payments", "cost", "good"),
      ]}
      queueTitle="Approval Queue"
      queue={["pendingVariations", "openRisks", "certifiedPayments", "documentsReview"]}
      shortcuts={[
        makeShortcut("overview", "Project health", "Scan schedule, cost, risk, safety, and quality."),
        makeShortcut("cost", "Commercial approvals", "Review IPCs, payments, and variations."),
        makeShortcut("reports", "Compliance reports", "Generate executive and regulatory exports."),
      ]}
    />
  );
}
