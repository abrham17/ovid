import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function SuperintendentDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="SUPERINTENDENT"
      title="Superintendent Dashboard"
      description="Site execution control, daily-report countersignature, stoppages, and quality/safety blockers."
      metrics={[
        metric("pendingDaily", "Daily reports to countersign", "daily", "warn"),
        metric("openIncidents", "Open safety incidents", "safety", "bad"),
        metric("openDefects", "Open defects", "quality", "warn"),
        metric("avgProgress", "Average progress", "schedule", "good"),
      ]}
      queueTitle="Execution Queue"
      queue={["pendingDaily", "openIncidents", "openDefects", "openRisks"]}
      shortcuts={[
        { href: "/team", label: "Invite site crew", detail: "Invite foremen, site engineers, HSE, and QC." },
        makeShortcut("daily", "Countersign reports", "Review field reports waiting in the chain."),
        makeShortcut("schedule", "Schedule control", "Inspect activity progress and stoppages."),
        makeShortcut("quality", "Quality closeout", "Follow defects and punch-list pressure."),
      ]}
    />
  );
}
