import type { ScopedMetricKey } from "@/lib/dashboard/metric-keys";
import { DASHBOARD_METRIC_KEYS, OVERVIEW_METRIC_KEYS } from "@/lib/dashboard/metric-keys";

export type SensitivityClass =
  | "PROJECT_WIDE"
  | "BRANCH_SCOPED"
  | "OWN_CONTRACT_ONLY"
  | "COST_DETAIL"
  | "OTHER_PARTY_EVENTS"
  | "OPERATIONAL";

/**
 * Every metric must be classified before it can be queried.
 * Unclassified keys fail the compile-time completeness check below.
 */
export const METRIC_SENSITIVITY: Record<ScopedMetricKey, SensitivityClass> = {
  // --- Role dashboard metrics ---
  projects: "PROJECT_WIDE",
  avgProgress: "PROJECT_WIDE",
  openRisks: "PROJECT_WIDE",
  openIncidents: "PROJECT_WIDE",
  pendingDaily: "BRANCH_SCOPED",
  submittedMeasurements: "OWN_CONTRACT_ONLY",
  certifiedPayments: "OWN_CONTRACT_ONLY",
  openDefects: "BRANCH_SCOPED",
  openPunches: "BRANCH_SCOPED",
  materialDemands: "BRANCH_SCOPED",
  purchaseOrders: "PROJECT_WIDE",
  pendingVariations: "PROJECT_WIDE",
  equipmentDownHours: "OPERATIONAL",
  laborAssignments: "BRANCH_SCOPED",
  documentsReview: "PROJECT_WIDE",
  regulatoryReports: "PROJECT_WIDE",
  users: "PROJECT_WIDE",
  organizations: "PROJECT_WIDE",

  // --- Project overview fields ---
  wbsNodeCount: "BRANCH_SCOPED",
  activityCount: "BRANCH_SCOPED",
  measurementCount: "OWN_CONTRACT_ONLY",
  certifiedPaymentsCount: "OWN_CONTRACT_ONLY",
  equipmentCount: "OPERATIONAL",
  documentCount: "PROJECT_WIDE",
  pendingDailyReports: "BRANCH_SCOPED",
  recentStoppages: "OTHER_PARTY_EVENTS",
  contractValue: "OWN_CONTRACT_ONLY",
};

/** Metrics gated by canViewOperationalData when sensitivity is OPERATIONAL. */
export const OPERATIONAL_METRIC_KEYS = new Set<ScopedMetricKey>([
  "pendingDaily",
  "equipmentDownHours",
  "laborAssignments",
  "equipmentCount",
  "pendingDailyReports",
]);

// Compile-time guarantee: every dashboard config MetricKey has a sensitivity class.
type _DashboardKeysCovered = (typeof DASHBOARD_METRIC_KEYS)[number] extends keyof typeof METRIC_SENSITIVITY
  ? true
  : never;
type _OverviewKeysCovered = (typeof OVERVIEW_METRIC_KEYS)[number] extends keyof typeof METRIC_SENSITIVITY
  ? true
  : never;
const _dashboardCoverage: _DashboardKeysCovered = true;
const _overviewCoverage: _OverviewKeysCovered = true;
void _dashboardCoverage;
void _overviewCoverage;

export function getSensitivity(key: ScopedMetricKey): SensitivityClass {
  return METRIC_SENSITIVITY[key];
}
