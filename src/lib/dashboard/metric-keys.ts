/** Role-dashboard metric keys (file 09 §5 — job-function personalization). */
export const DASHBOARD_METRIC_KEYS = [
  "projects",
  "avgProgress",
  "openRisks",
  "openIncidents",
  "pendingDaily",
  "submittedMeasurements",
  "certifiedPayments",
  "openDefects",
  "openPunches",
  "materialDemands",
  "purchaseOrders",
  "pendingVariations",
  "equipmentDownHours",
  "laborAssignments",
  "documentsReview",
  "regulatoryReports",
  "users",
  "organizations",
] as const;

/** Project-overview field keys (scoped the same way as dashboard metrics). */
export const OVERVIEW_METRIC_KEYS = [
  "wbsNodeCount",
  "activityCount",
  "measurementCount",
  "certifiedPaymentsCount",
  "equipmentCount",
  "documentCount",
  "pendingDailyReports",
  "recentStoppages",
  "contractValue",
] as const;

export type DashboardMetricKey = (typeof DASHBOARD_METRIC_KEYS)[number];
export type OverviewMetricKey = (typeof OVERVIEW_METRIC_KEYS)[number];
export type ScopedMetricKey = DashboardMetricKey | OverviewMetricKey;
