import type { ComponentType } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import { AdminDashboard } from "@/components/dashboards/admin/AdminDashboard";
import { ClientRepDashboard } from "@/components/dashboards/client-rep/ClientRepDashboard";
import { ConsultantEngineerDashboard } from "@/components/dashboards/consultant-engineer/ConsultantEngineerDashboard";
import { ContractsLegalDashboard } from "@/components/dashboards/contracts-legal/ContractsLegalDashboard";
import { DeputyPmDashboard } from "@/components/dashboards/deputy-pm/DeputyPmDashboard";
import { EquipmentManagerDashboard } from "@/components/dashboards/equipment-manager/EquipmentManagerDashboard";
import { FinanceDashboard } from "@/components/dashboards/finance/FinanceDashboard";
import { ForemanDashboard } from "@/components/dashboards/foreman/ForemanDashboard";
import { HseOfficerDashboard } from "@/components/dashboards/hse-officer/HseOfficerDashboard";
import { HrDashboard } from "@/components/dashboards/hr/HrDashboard";
import { ProcurementDashboard } from "@/components/dashboards/procurement/ProcurementDashboard";
import { QcInspectorDashboard } from "@/components/dashboards/qc-inspector/QcInspectorDashboard";
import { QsDashboard } from "@/components/dashboards/qs/QsDashboard";
import { SeniorPmDashboard } from "@/components/dashboards/senior-pm/SeniorPmDashboard";
import { SiteEngineerDashboard } from "@/components/dashboards/site-engineer/SiteEngineerDashboard";
import { SuperintendentDashboard } from "@/components/dashboards/superintendent/SuperintendentDashboard";
import type { DashboardProps } from "@/components/dashboards/dashboard-shell";

export type RoleLandingTarget =
  | { type: "path"; path: string }
  | { type: "project"; tab?: string }
  | { type: "dashboard" };

export const roleLandingConfig: Record<UserRole, RoleLandingTarget> = {
  GENERAL_MANAGER: { type: "dashboard" },
  MANAGING_DIRECTOR: { type: "dashboard" },
  CFO: { type: "dashboard" },
  CHIEF_ENGINEER: { type: "dashboard" },
  IT_ADMIN: { type: "dashboard" },
  CONTRACTS_MANAGER: { type: "dashboard" },
  PROCUREMENT_MANAGER: { type: "dashboard" },
  EQUIPMENT_MANAGER: { type: "dashboard" },
  HR_MANAGER: { type: "dashboard" },
  SAFETY_DIRECTOR: { type: "dashboard" },
  FOREMAN: { type: "dashboard" },
  SUPERINTENDENT: { type: "dashboard" },
  SITE_ENGINEER: { type: "dashboard" },
  DEPUTY_PM: { type: "dashboard" },
  SENIOR_PM: { type: "dashboard" },
  QC_INSPECTOR: { type: "dashboard" },
  HSE_OFFICER: { type: "dashboard" },
  QS: { type: "dashboard" },
  PROCUREMENT: { type: "dashboard" },
  FINANCE: { type: "dashboard" },
  HR: { type: "dashboard" },
  CONTRACTS_LEGAL: { type: "dashboard" },
  CONSULTANT_ENGINEER: { type: "dashboard" },
  CLIENT_REP: { type: "dashboard" },
  SUBCONTRACTOR_PM: { type: "dashboard" },
  SUBCONTRACTOR_REP: { type: "dashboard" },
  SUPPLIER_REP: { type: "dashboard" },
  REGULATOR_INSPECTOR: { type: "dashboard" },
  ADMIN: { type: "dashboard" },
};

export const dashboardRegistry: Record<UserRole, ComponentType<DashboardProps>> = {
  GENERAL_MANAGER: AdminDashboard,
  MANAGING_DIRECTOR: AdminDashboard,
  CFO: FinanceDashboard,
  CHIEF_ENGINEER: AdminDashboard,
  IT_ADMIN: AdminDashboard,
  CONTRACTS_MANAGER: ContractsLegalDashboard,
  PROCUREMENT_MANAGER: ProcurementDashboard,
  EQUIPMENT_MANAGER: EquipmentManagerDashboard,
  HR_MANAGER: HrDashboard,
  SAFETY_DIRECTOR: HseOfficerDashboard,
  FOREMAN: ForemanDashboard,
  SUPERINTENDENT: SuperintendentDashboard,
  SITE_ENGINEER: SiteEngineerDashboard,
  DEPUTY_PM: DeputyPmDashboard,
  SENIOR_PM: SeniorPmDashboard,
  QC_INSPECTOR: QcInspectorDashboard,
  HSE_OFFICER: HseOfficerDashboard,
  QS: QsDashboard,
  PROCUREMENT: ProcurementDashboard,
  FINANCE: FinanceDashboard,
  HR: HrDashboard,
  CONTRACTS_LEGAL: ContractsLegalDashboard,
  CONSULTANT_ENGINEER: ConsultantEngineerDashboard,
  CLIENT_REP: ClientRepDashboard,
  SUBCONTRACTOR_PM: SeniorPmDashboard,
  SUBCONTRACTOR_REP: SiteEngineerDashboard,
  SUPPLIER_REP: ProcurementDashboard,
  REGULATOR_INSPECTOR: AdminDashboard,
  ADMIN: AdminDashboard,
};
