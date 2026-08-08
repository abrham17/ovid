"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function ForemanDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="FOREMAN"
      title="Foreman Dashboard"
      description="Daily site reporting, field safety signals, and the work packages that need attention today."
      metrics={[
        metric("pendingDaily", "Reports awaiting sign-off", "daily", "warn"),
        metric("openIncidents", "Open safety incidents", "safety", "bad"),
        metric("avgProgress", "Average progress", "schedule", "good"),
        metric("openPunches", "Open punch items", "quality", "warn"),
      ]}
      queueTitle="Field Queue"
      queue={["pendingDaily", "openIncidents", "openPunches", "materialDemands"]}
      shortcuts={[
        makeShortcut("daily", "Daily reports", "Enter earthwork, structure, and rebar progress."),
        makeShortcut("safety", "Safety observations", "Log hazards before they become incidents."),
        makeShortcut("resources", "Labor and custody", "Track crew allocation and handovers."),
      ]}
    />
  );
}
