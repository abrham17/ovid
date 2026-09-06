import type { CompanyApprovalStatus, CompanyApprovalType, CompanyStaffRole, PartyType, ProjectStatus } from "@/generated/prisma/enums";

export type CompanyOrganizationOption = { id: string; name: string; partyType: PartyType };
export type CompanyProjectOption = { id: string; code: string; name: string };
export type CompanyUserOption = { id: string; fullName: string; email: string; jobTitle: string };
export type CompanyContextPayload = { organizations: CompanyOrganizationOption[]; projects: CompanyProjectOption[]; users: CompanyUserOption[] };

export type CompanyPortfolioProject = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  contractValue: number;
  plannedStartDate: string;
  plannedEndDate: string;
  plannedProgress: number;
  actualProgress: number;
  scheduleVariance: number;
  baselineVarianceDays: number;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  spi: number | null;
  cpi: number | null;
  criticalActivities: number;
};

export type CompanyDashboardPayload = {
  projects: CompanyPortfolioProject[];
  metrics: {
    projects: number; activeProjects: number; openRisks: number; openIncidents: number; openDefects: number;
    pendingVariations: number; overdueActivities: number; resourceConflicts: number; auditEvents: number;
    regulatoryReports: number; pendingApprovals: number; openTenders: number; certifiedIpcs: number;
    certifiedUnpaidValue: number; activeContractValue: number; paidIpcValue: number; actualCostValue: number;
    portfolioPlannedValue: number; portfolioEarnedValue: number; portfolioSpi: number | null; portfolioCpi: number | null;
    criticalActivities: number; openAuditFindings: number; overdueAuditFindings: number;
    equipmentOperatingHours: number; equipmentIdleHours: number; equipmentDownHours: number;
  };
};

export type CompanyApprovalRow = {
  id: string; type: CompanyApprovalType; status: CompanyApprovalStatus; entityType: string; entityId: string;
  amount: string | number | null; comment: string | null; requestedAt: string; reviewedAt: string | null;
  requestedBy: { fullName: string }; reviewedBy: { fullName: string } | null;
};

export type CompanyTenderRow = {
  id: string; bidNo: string; title: string; description: string | null; amount: string | number | null;
  result: "DRAFT" | "SUBMITTED" | "WON" | "LOST" | "CANCELLED"; supplierOrgId: string | null;
  projectId: string | null; project: { id: string; name: string; code: string } | null;
};

export type CompanyRole = CompanyStaffRole;
