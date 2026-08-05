import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function SiteEngineerDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="SITE_ENGINEER"
      title="Site Engineer Dashboard"
      description="Technical progress, measured quantities, BoQ links, and live work-package follow-up."
      metrics={[
        metric("avgProgress", "Average progress", "schedule", "good"),
        metric("submittedMeasurements", "Submitted measurements", "cost", "warn"),
        metric("openDefects", "Open defects", "quality", "warn"),
        metric("pendingDaily", "Daily reports in chain", "daily", "warn"),
      ]}
      queueTitle="Technical Queue"
      queue={["submittedMeasurements", "openDefects", "pendingDaily", "openRisks"]}
      shortcuts={[
        makeShortcut("schedule", "Activity progress", "Update work-package progress and blockers."),
        makeShortcut("cost", "Measurements and BoQ", "Prepare IPC quantities tied to WBS."),
        makeShortcut("engineering", "Engineering takeoff", "Manage structural elements and progress checkpoints."),
      ]}
    />
  );
}
