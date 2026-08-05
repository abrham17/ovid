import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function ClientRepDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="CLIENT_REP"
      title="Client Representative Dashboard"
      description="High-level progress, certified payment visibility, open risks, safety status, and controlled documents."
      metrics={[
        metric("avgProgress", "Average progress", "schedule", "good"),
        metric("certifiedPayments", "Certified payments", "cost", "good"),
        metric("openRisks", "Open risks", "risk", "warn"),
        metric("openIncidents", "Open safety incidents", "safety", "bad"),
      ]}
      queueTitle="Client View"
      queue={["avgProgress", "certifiedPayments", "openRisks", "openIncidents"]}
      shortcuts={[
        makeShortcut("overview", "Project overview", "Review status, health, and attention items."),
        makeShortcut("documents", "Controlled documents", "See issued project documents and decisions."),
        makeShortcut("schedule", "Schedule status", "Monitor progress without operational overload."),
      ]}
    />
  );
}
