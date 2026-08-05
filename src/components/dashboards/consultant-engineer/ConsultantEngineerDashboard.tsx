import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/dashboard-shell";

export function ConsultantEngineerDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="CONSULTANT_ENGINEER"
      title="Consultant Engineer Dashboard"
      description="Measurement certification, variation review, quality evidence, and controlled technical approvals."
      metrics={[
        metric("submittedMeasurements", "Measurements to certify", "cost", "warn"),
        metric("pendingVariations", "Variations to review", "cost", "warn"),
        metric("openDefects", "Open defects", "quality", "bad"),
        metric("documentsReview", "Documents under review", "documents", "warn"),
      ]}
      queueTitle="Certification Queue"
      queue={["submittedMeasurements", "pendingVariations", "openDefects", "documentsReview"]}
      shortcuts={[
        makeShortcut("cost", "Certify measurements", "Query or certify submitted IPC quantities."),
        makeShortcut("quality", "Quality evidence", "Inspect ITRs, defects, and punch-list movement."),
        makeShortcut("documents", "Approve documents", "Review drawings, reports, and decisions."),
      ]}
    />
  );
}
