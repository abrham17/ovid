import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForemanDashboard } from "@/components/dashboards/foreman/ForemanDashboard";
import { SuperintendentDashboard } from "@/components/dashboards/superintendent/SuperintendentDashboard";
import { SiteEngineerDashboard } from "@/components/dashboards/site-engineer/SiteEngineerDashboard";
import { SeniorPmDashboard } from "@/components/dashboards/senior-pm/SeniorPmDashboard";
import { DeputyPmDashboard } from "@/components/dashboards/deputy-pm/DeputyPmDashboard";
import { QcInspectorDashboard } from "@/components/dashboards/qc-inspector/QcInspectorDashboard";
import { HseOfficerDashboard } from "@/components/dashboards/hse-officer/HseOfficerDashboard";
import { QsDashboard } from "@/components/dashboards/qs/QsDashboard";
import { ProcurementDashboard } from "@/components/dashboards/procurement/ProcurementDashboard";
import { FinanceDashboard } from "@/components/dashboards/finance/FinanceDashboard";
import { HrDashboard } from "@/components/dashboards/hr/HrDashboard";
import { EquipmentManagerDashboard } from "@/components/dashboards/equipment-manager/EquipmentManagerDashboard";
import { ContractsLegalDashboard } from "@/components/dashboards/contracts-legal/ContractsLegalDashboard";
import { ConsultantEngineerDashboard } from "@/components/dashboards/consultant-engineer/ConsultantEngineerDashboard";
import { ClientRepDashboard } from "@/components/dashboards/client-rep/ClientRepDashboard";
import { AdminDashboard } from "@/components/dashboards/admin/AdminDashboard";
import type { UserRole } from "@/generated/prisma/enums";

const DASHBOARD_MAP: Record<
  UserRole,
  React.ComponentType<{
    userId: string;
    organizationId: string;
    partyType: any;
    organizationName: string;
  }>
> = {
  FOREMAN: ForemanDashboard,
  SUPERINTENDENT: SuperintendentDashboard,
  SITE_ENGINEER: SiteEngineerDashboard,
  SENIOR_PM: SeniorPmDashboard,
  DEPUTY_PM: DeputyPmDashboard,
  QC_INSPECTOR: QcInspectorDashboard,
  HSE_OFFICER: HseOfficerDashboard,
  QS: QsDashboard,
  PROCUREMENT: ProcurementDashboard,
  FINANCE: FinanceDashboard,
  HR: HrDashboard,
  EQUIPMENT_MANAGER: EquipmentManagerDashboard,
  CONTRACTS_LEGAL: ContractsLegalDashboard,
  CONSULTANT_ENGINEER: ConsultantEngineerDashboard,
  CLIENT_REP: ClientRepDashboard,
  ADMIN: AdminDashboard,
  SUBCONTRACTOR_PM: SeniorPmDashboard,
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const Dashboard = DASHBOARD_MAP[session.role] ?? SeniorPmDashboard;

  return (
    <Dashboard
      userId={session.id}
      organizationId={session.organizationId}
      partyType={session.partyType}
      organizationName={session.organizationName}
    />
  );
}
