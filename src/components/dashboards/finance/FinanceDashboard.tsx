import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function FinanceDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="FINANCE"
      title="Finance Dashboard"
      description="Actual costs, certified payments, cash-flow status, and financial control across visible projects."
      metrics={[
        metric("certifiedPayments", "Certified payments", "cost", "good"),
        metric("submittedMeasurements", "Submitted IPCs", "cost", "warn"),
        metric("purchaseOrders", "PO commitments", "procurement", "warn"),
        metric("pendingVariations", "Pending variations", "cost", "warn"),
      ]}
      queueTitle="Finance Queue"
      queue={["certifiedPayments", "submittedMeasurements", "purchaseOrders", "pendingVariations"]}
      shortcuts={[
        makeShortcut("cost", "Cost records", "Record actuals and track payment status."),
        makeShortcut("procurement", "Commitments", "Review PO amount and receipt movement."),
        makeShortcut("reports", "Financial reports", "Export payment and progress summaries."),
      ]}
    />
  );
}
