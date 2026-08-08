"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function EquipmentManagerDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="EQUIPMENT_MANAGER"
      title="Equipment Manager Dashboard"
      description="Fleet usage, down hours, custody transfers, and equipment allocation across active work."
      metrics={[
        metric("equipmentDownHours", "Equipment down hours", "resources", "bad"),
        metric("projects", "Visible projects", undefined, "good"),
        metric("materialDemands", "Material demands", "resources", "warn"),
        metric("openIncidents", "Open incidents", "safety", "bad"),
      ]}
      queueTitle="Fleet Queue"
      queue={["equipmentDownHours", "projects", "materialDemands", "openIncidents"]}
      shortcuts={[
        makeShortcut("resources", "Equipment logs", "Track fleet, usage hours, and custody movement."),
        makeShortcut("schedule", "Activity demand", "Match equipment needs to work packages."),
        makeShortcut("daily", "Daily usage", "Compare site-reported equipment hours."),
      ]}
    />
  );
}
