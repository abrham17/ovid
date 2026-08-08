"use client";
import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function QcInspectorDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="QC_INSPECTOR"
      title="QC Inspector Dashboard"
      description="Inspection records, defect verification, punch-list trends, and quality closeout pressure."
      metrics={[
        metric("openDefects", "Open defects", "quality", "bad"),
        metric("openPunches", "Open punch items", "quality", "warn"),
        metric("documentsReview", "Documents under review", "documents", "warn"),
        metric("avgProgress", "Average progress", "schedule", "good"),
      ]}
      queueTitle="Quality Queue"
      queue={["openDefects", "openPunches", "documentsReview", "pendingDaily"]}
      shortcuts={[
        makeShortcut("quality", "ITR and defects", "Record inspections and close verified defects."),
        makeShortcut("documents", "Controlled documents", "Check issued drawings and specifications."),
        makeShortcut("reports", "Quality exports", "Generate compliance-facing quality records."),
      ]}
    />
  );
}
