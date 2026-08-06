import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function DeputyPmDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="DEPUTY_PM"
      title="Deputy PM Dashboard"
      description="Second-tier project control across schedule exceptions, risk escalation, and approval queues."
      metrics={[
        metric("openRisks", "Open risks", "risk", "warn"),
        metric("pendingVariations", "Pending variations", "cost", "warn"),
        metric("openIncidents", "Open incidents", "safety", "bad"),
        metric("avgProgress", "Average progress", "schedule", "good"),
      ]}
      queueTitle="Control Queue"
      queue={["openRisks", "pendingVariations", "openIncidents", "documentsReview"]}
      shortcuts={[
        { href: "/team", label: "Invite team", detail: "Send email invitations for your organization." },
        makeShortcut("risk", "Risk register", "Escalate risks into stoppages or variations."),
        makeShortcut("cost", "Variation queue", "Review contractor-side variation movement."),
        makeShortcut("documents", "Decisions", "Record decisions and supporting rationale."),
      ]}
    />
  );
}
