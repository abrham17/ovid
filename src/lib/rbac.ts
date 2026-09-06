import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  role: UserRole;
  organizationId: string;
  partyType: PartyType;
  organizationName: string;
  jobTitle: string;
};

/** C-Suite and Executive Governance Roles with portfolio-wide access */
export const EXECUTIVE_ROLES: UserRole[] = [
  "GENERAL_MANAGER",
  "MANAGING_DIRECTOR",
  "CFO",
  "CHIEF_ENGINEER",
  "IT_ADMIN",
  "ADMIN",
];

export function isExecutiveUser(role: UserRole): boolean {
  return EXECUTIVE_ROLES.includes(role);
}

/** Returns the authenticated user or redirects to login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");
  return {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    partyType: user.partyType,
    organizationName: user.organizationName,
    jobTitle: user.jobTitle,
  };
}

export type ProjectParty = {
  organizationId: string;
  partyType: PartyType;
  projectRole: string;
};

export async function getProjectParty(
  user: SessionUser,
  projectId: string
): Promise<ProjectParty | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      contractorOrgId: true,
      clientOrgId: true,
      consultantOrgId: true,
    },
  });
  if (!project) return null;

  if (
    isExecutiveUser(user.role) ||
    user.organizationId === project.contractorOrgId
  ) {
    return {
      organizationId: user.organizationId,
      partyType: "CONTRACTOR",
      projectRole: "Contractor Executive",
    };
  }
  if (user.organizationId === project.clientOrgId) {
    return { organizationId: user.organizationId, partyType: "CLIENT", projectRole: "Client" };
  }
  if (
    project.consultantOrgId &&
    user.organizationId === project.consultantOrgId
  ) {
    return { organizationId: user.organizationId, partyType: "CONSULTANT", projectRole: "Consultant" };
  }

  const membership = await db.projectMembership.findFirst({
    where: {
      projectId,
      organizationId: user.organizationId,
      userId: user.id,
    },
    include: { organization: { select: { partyType: true } } },
  });
  if (!membership) return null;

  return {
    organizationId: membership.organizationId,
    partyType: membership.organization.partyType,
    projectRole: membership.projectRole,
  };
}

export async function getUserProjects(user: SessionUser) {
  if (isExecutiveUser(user.role)) {
    return db.project.findMany({ orderBy: { createdAt: "desc" } });
  }

  const asParty = await db.project.findMany({
    where: {
      OR: [
        { contractorOrgId: user.organizationId },
        { clientOrgId: user.organizationId },
        { consultantOrgId: user.organizationId },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const membershipProjects = await db.projectMembership.findMany({
    where: { organizationId: user.organizationId },
    select: { projectId: true },
  });
  if (membershipProjects.length === 0) return asParty;
  const viaMembership = await db.project.findMany({
    where: {
      id: {
        in: membershipProjects.map((m) => m.projectId),
        notIn: asParty.map((p) => p.id),
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return [...asParty, ...viaMembership];
}

export const WORKSPACE_TABS = [
  "overview",
  "wbs",
  "daily",
  "schedule",
  "cost",
  "risk",
  "safety",
  "quality",
  "resources",
  "engineering",
  "documents",
  "procurement",
  "reports",
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

const PARTY_TAB_CEILING: Record<PartyType, WorkspaceTab[]> = {
  CONTRACTOR:   [...WORKSPACE_TABS],
  CONSULTANT:   ["overview", "schedule", "cost", "risk", "safety", "quality", "documents", "reports"],
  CLIENT:       ["overview", "schedule", "cost", "risk", "safety", "quality", "documents"],
  SUBCONTRACTOR:["overview", "daily", "schedule", "cost", "risk", "safety", "quality", "resources", "documents"],
  SUPPLIER:     ["overview", "documents", "procurement"],
  REGULATOR:    ["overview", "reports"],
};

const ROLE_TAB_PERMISSIONS: Partial<Record<UserRole, WorkspaceTab[]>> = {
  GENERAL_MANAGER:    [...WORKSPACE_TABS],
  MANAGING_DIRECTOR:  [...WORKSPACE_TABS],
  CFO:                ["overview", "cost", "documents", "reports", "procurement"],
  CHIEF_ENGINEER:     [...WORKSPACE_TABS],
  IT_ADMIN:           [...WORKSPACE_TABS],
  ADMIN:              [...WORKSPACE_TABS],
  CONTRACTS_MANAGER:  ["overview", "wbs", "cost", "risk", "documents", "reports"],
  PROCUREMENT_MANAGER:["overview", "procurement", "resources", "documents", "reports"],
  EQUIPMENT_MANAGER:  ["overview", "resources", "daily", "documents"],
  HR_MANAGER:         ["overview", "resources", "documents"],
  SAFETY_DIRECTOR:    ["overview", "safety", "risk", "documents", "reports"],
  SENIOR_PM:          [...WORKSPACE_TABS],
  DEPUTY_PM:          [...WORKSPACE_TABS],
  SUPERINTENDENT:     ["overview", "wbs", "daily", "schedule", "cost", "risk", "safety", "quality", "resources", "engineering", "documents"],
  SITE_ENGINEER:      ["overview", "wbs", "daily", "schedule", "quality", "resources", "engineering", "documents"],
  FOREMAN:            ["overview", "wbs", "daily", "quality", "safety", "resources"],
  QC_INSPECTOR:       ["overview", "wbs", "quality", "documents", "reports"],
  HSE_OFFICER:        ["overview", "wbs", "safety", "risk", "documents", "reports"],
  QS:                 ["overview", "wbs", "cost", "schedule", "engineering", "documents", "reports"],
  FINANCE:            ["overview", "cost", "documents", "reports"],
  CONTRACTS_LEGAL:    ["overview", "wbs", "cost", "risk", "documents", "reports"],
  PROCUREMENT:        ["overview", "procurement", "resources", "documents"],
  HR:                 ["overview", "resources", "documents"],
  CONSULTANT_ENGINEER:["overview", "schedule", "cost", "risk", "safety", "quality", "documents", "reports"],
  CLIENT_REP:         ["overview", "schedule", "cost", "risk", "safety", "quality", "documents"],
  SUBCONTRACTOR_PM:   ["overview", "daily", "schedule", "cost", "quality", "resources"],
  SUBCONTRACTOR_REP:  ["overview", "daily", "quality"],
  SUPPLIER_REP:       ["overview", "procurement"],
  REGULATOR_INSPECTOR:["overview", "reports"],
};

export function getWorkspaceTabs(partyType: PartyType, role: UserRole): WorkspaceTab[] {
  const partyCeiling = new Set(PARTY_TAB_CEILING[partyType] ?? ["overview"]);
  const rolePermitted = new Set(ROLE_TAB_PERMISSIONS[role] ?? WORKSPACE_TABS);
  return WORKSPACE_TABS.filter((tab) => partyCeiling.has(tab) && rolePermitted.has(tab));
}

export function isScopedParty(partyType: PartyType): boolean {
  return partyType === "SUBCONTRACTOR" || partyType === "SUPPLIER";
}

export const SITE_FACING_ROLES: UserRole[] = [
  "FOREMAN",
  "SITE_ENGINEER",
  "HSE_OFFICER",
  "QC_INSPECTOR",
  "SUPERINTENDENT",
];

export const OFFICE_FACING_ROLES: UserRole[] = [
  "SENIOR_PM",
  "DEPUTY_PM",
  "FINANCE",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "QS",
  "PROCUREMENT",
  "GENERAL_MANAGER",
  "MANAGING_DIRECTOR",
  "CFO",
  "CHIEF_ENGINEER",
  "IT_ADMIN",
];

const DAILY_ENTRY_ROLES: UserRole[] = ["FOREMAN", "SITE_ENGINEER", "SUBCONTRACTOR_REP"];

export function canEnterDailyReport(role: UserRole): boolean {
  return DAILY_ENTRY_ROLES.includes(role);
}

export const DAILY_SIGN_OFF_CHAIN: UserRole[] = [
  "SUPERINTENDENT",
  "DEPUTY_PM",
  "SENIOR_PM",
];

export function canSignOffDailyReport(role: UserRole): boolean {
  return (
    role === "SUPERINTENDENT" ||
    role === "DEPUTY_PM" ||
    role === "SENIOR_PM" ||
    isExecutiveUser(role)
  );
}

export function canLogSafetyObservation(role: UserRole): boolean {
  return SITE_FACING_ROLES.includes(role);
}

export function canEscalateSafetyIncident(role: UserRole): boolean {
  return role === "HSE_OFFICER" || role === "SUPERINTENDENT" || role === "SAFETY_DIRECTOR";
}

export function canCloseSafetyIncident(role: UserRole): boolean {
  return role === "HSE_OFFICER" || role === "SAFETY_DIRECTOR";
}

export function canFlagActivityBlocked(role: UserRole): boolean {
  return role === "HSE_OFFICER" || role === "SAFETY_DIRECTOR";
}

export function canApproveScheduleBaseline(role: UserRole): boolean {
  return role === "SENIOR_PM" || isExecutiveUser(role);
}

export function canRecordStoppage(role: UserRole): boolean {
  return ["FOREMAN", "SITE_ENGINEER", "SUPERINTENDENT"].includes(role);
}

export function canCertifyMeasurement(partyType: PartyType, role: UserRole): boolean {
  return partyType === "CONSULTANT" && role === "CONSULTANT_ENGINEER";
}

const BOQ_EDIT_ROLES: UserRole[] = ["QS", "SITE_ENGINEER", "CHIEF_ENGINEER"];
const COST_RECORD_ROLES: UserRole[] = ["QS", "FINANCE", "CFO"];
const IPC_PREPARE_ROLES: UserRole[] = ["QS", "SITE_ENGINEER"];
const IPC_REVIEW_ROLES: UserRole[] = ["SITE_ENGINEER", "SUPERINTENDENT", "DEPUTY_PM"];
const IPC_PAY_ROLES: UserRole[] = ["FINANCE", "CFO"];
const VARIATION_PREPARE_ROLES: UserRole[] = ["QS", "SITE_ENGINEER", "CONTRACTS_LEGAL", "CONTRACTS_MANAGER"];
const VARIATION_CONTRACTOR_CHECK_ROLES: UserRole[] = ["CONTRACTS_LEGAL", "CONTRACTS_MANAGER", "DEPUTY_PM", "SENIOR_PM", "GENERAL_MANAGER"];

export function canManageBoq(role: UserRole): boolean {
  return BOQ_EDIT_ROLES.includes(role);
}

export function canRecordCostActual(role: UserRole): boolean {
  return COST_RECORD_ROLES.includes(role);
}

export function canPrepareIpc(role: UserRole): boolean {
  return IPC_PREPARE_ROLES.includes(role);
}

export function canReviewIpc(role: UserRole): boolean {
  return IPC_REVIEW_ROLES.includes(role);
}

export function canPayIpc(role: UserRole): boolean {
  return IPC_PAY_ROLES.includes(role);
}

export function canPrepareVariation(role: UserRole): boolean {
  return VARIATION_PREPARE_ROLES.includes(role);
}

export function canCheckContractorVariation(role: UserRole): boolean {
  return VARIATION_CONTRACTOR_CHECK_ROLES.includes(role);
}

export function canCheckConsultantVariation(partyType: PartyType, role: UserRole): boolean {
  return partyType === "CONSULTANT" && role === "CONSULTANT_ENGINEER";
}

export function canApproveVariation(partyType: PartyType, role: UserRole): boolean {
  return canCheckConsultantVariation(partyType, role);
}

export function canSeeMargin(partyType: PartyType): boolean {
  return partyType === "CONTRACTOR";
}

export function canSeeCostVariance(partyType: PartyType): boolean {
  return partyType === "CONTRACTOR" || partyType === "CONSULTANT";
}

const RISK_ENTRY_ROLES: UserRole[] = [
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "QS",
  "DEPUTY_PM",
  "SENIOR_PM",
  "CONTRACTS_LEGAL",
  "HSE_OFFICER",
  "PROCUREMENT",
  "GENERAL_MANAGER",
];
const RISK_CLOSE_ROLES: UserRole[] = ["SENIOR_PM", "DEPUTY_PM", "GENERAL_MANAGER"];

export function canCreateRisk(role: UserRole): boolean {
  return RISK_ENTRY_ROLES.includes(role);
}

export function canCloseRisk(role: UserRole): boolean {
  return RISK_CLOSE_ROLES.includes(role);
}

export function canEscalateRisk(role: UserRole): boolean {
  return RISK_CLOSE_ROLES.includes(role);
}

const ENGINEERING_EDIT_ROLES: UserRole[] = ["SITE_ENGINEER", "SUPERINTENDENT", "CHIEF_ENGINEER"];
const ELEMENT_PROGRESS_ROLES: UserRole[] = ["FOREMAN", "SITE_ENGINEER", "SUPERINTENDENT"];

export function canEditEngineering(role: UserRole): boolean {
  return ENGINEERING_EDIT_ROLES.includes(role);
}

export function canRecordElementProgress(role: UserRole): boolean {
  return ELEMENT_PROGRESS_ROLES.includes(role);
}

const ITR_ROLES: UserRole[] = ["QC_INSPECTOR", "SITE_ENGINEER"];
const DEFECT_ROLES: UserRole[] = ["QC_INSPECTOR", "SITE_ENGINEER", "SUPERINTENDENT"];
const PUNCH_ROLES: UserRole[] = ["SITE_ENGINEER", "QC_INSPECTOR", "SUPERINTENDENT"];

export function canRecordItr(role: UserRole): boolean {
  return ITR_ROLES.includes(role);
}

export function canLogDefect(role: UserRole): boolean {
  return DEFECT_ROLES.includes(role);
}

export function canCloseDefect(role: UserRole): boolean {
  return ITR_ROLES.includes(role);
}

export function canManagePunchList(role: UserRole): boolean {
  return PUNCH_ROLES.includes(role);
}

export function canManageMaterials(role: UserRole): boolean {
  return ["PROCUREMENT", "PROCUREMENT_MANAGER", "SITE_ENGINEER", "SUPERINTENDENT"].includes(role);
}

export function canManageEquipment(role: UserRole): boolean {
  return ["EQUIPMENT_MANAGER", "SUPERINTENDENT"].includes(role);
}

export function canRecordLabor(role: UserRole): boolean {
  return ["HR", "HR_MANAGER", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

export function canRecordCustody(role: UserRole): boolean {
  return ["PROCUREMENT", "EQUIPMENT_MANAGER", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

export function canManagePurchaseOrders(role: UserRole): boolean {
  return ["PROCUREMENT", "PROCUREMENT_MANAGER", "SENIOR_PM"].includes(role);
}

export function canApprovePurchaseOrder(role: UserRole): boolean {
  return ["SENIOR_PM", "DEPUTY_PM", "PROCUREMENT_MANAGER", "CFO"].includes(role);
}

export function canRecordReceipt(role: UserRole): boolean {
  return ["PROCUREMENT", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

export function canManageBids(role: UserRole): boolean {
  return ["CONTRACTS_LEGAL", "CONTRACTS_MANAGER", "PROCUREMENT", "SENIOR_PM"].includes(role);
}

const DOC_ISSUE_ROLES: UserRole[] = [
  "SITE_ENGINEER",
  "SENIOR_PM",
  "DEPUTY_PM",
  "QS",
  "CONTRACTS_LEGAL",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "GENERAL_MANAGER",
];

export function canIssueDocument(role: UserRole): boolean {
  return DOC_ISSUE_ROLES.includes(role);
}

export function canApproveDocument(partyType: PartyType, role: UserRole): boolean {
  if (partyType === "CONSULTANT") return role === "CONSULTANT_ENGINEER";
  return role === "SENIOR_PM" || role === "DEPUTY_PM" || isExecutiveUser(role);
}

export function canRecordDecision(role: UserRole): boolean {
  return ["SENIOR_PM", "DEPUTY_PM", "CONSULTANT_ENGINEER", "GENERAL_MANAGER"].includes(role);
}

export function canRecordLessons(role: UserRole): boolean {
  return role !== "CLIENT_REP";
}

export function canGenerateReport(role: UserRole): boolean {
  return [
    "SENIOR_PM",
    "FINANCE",
    "QS",
    "HSE_OFFICER",
    "QC_INSPECTOR",
    "CONSULTANT_ENGINEER",
    "ADMIN",
    "GENERAL_MANAGER",
    "MANAGING_DIRECTOR",
  ].includes(role);
}

export function canAccessReportType(
  partyType: PartyType,
  reportType: "GRADING_RENEWAL" | "PROGRESS_SUBMISSION" | "SAFETY_COMPLIANCE" | "OTHER"
): boolean {
  if (reportType === "GRADING_RENEWAL") return partyType === "CONTRACTOR";
  return true;
}
