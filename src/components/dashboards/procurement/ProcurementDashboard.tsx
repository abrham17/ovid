"use client";

import { RoleDashboard, makeShortcut, metric, type DashboardProps } from "@/components/dashboards/role-dashboard-shell";

export function ProcurementDashboard(props: DashboardProps) {
  return (
    <RoleDashboard
      {...props}
      role="PROCUREMENT"
      title="Procurement Dashboard"
      description="Material demand, purchase orders, receipts, suppliers, and tender movement."
      metrics={[
        metric("materialDemands", "Open material demands", "resources", "warn"),
        metric("purchaseOrders", "POs in flight", "procurement", "warn"),
        metric("openRisks", "Procurement risks", "risk", "warn"),
        metric("documentsReview", "Procurement docs under review", "documents", "warn"),
      ]}
      queueTitle="Supply Queue"
      queue={["materialDemands", "purchaseOrders", "openRisks", "documentsReview"]}
      shortcuts={[
        makeShortcut("procurement", "Purchase orders", "Create, issue, and track purchase orders."),
        makeShortcut("resources", "Material demand", "Connect demand signals to project work."),
        makeShortcut("documents", "Supplier documents", "Control procurement correspondence and records."),
      ]}
    />
  );
}
