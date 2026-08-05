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

/**
 * Layer 1 — which party does this user's organization represent on a project,
 * and can they see the project at all?
 *
 * The project's own contractor/client/consultant orgs are always party members
 * for visibility purposes; other organizations must hold an explicit
 * ProjectMembership. This is the join every data query must pass through.
 */
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

  // System/ADMIN users of the contractor org see contractor-side data.
  if (
    user.role === "ADMIN" ||
    user.organizationId === project.contractorOrgId
  ) {
    return {
      organizationId: user.organizationId,
      partyType: "CONTRACTOR",
      projectRole: "Contractor",
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

  // Any other party must hold an explicit membership (subcontractor, supplier,
  // regulator, or a secondary client/consultant org).
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

/** Lists the projects the user's organization can see (Layer-1 filtered). */
export async function getUserProjects(user: SessionUser) {
  if (user.role === "ADMIN") {
    return db.project.findMany({ orderBy: { createdAt: "desc" } });
  }
  // Contractor/Client/Consultant orgs: projects where their org is the named party.
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
  // Everyone else (subcontractor/supplier/regulator): projects with an explicit membership.
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

// ---------------------------------------------------------------
// Workspace tab visibility per Layer-1 party (file 09 §4).
// ---------------------------------------------------------------

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

/** Layer-1 ceiling: maximum tabs per organization party type. */
const PARTY_TAB_CEILING: Record<PartyType, WorkspaceTab[]> = {
  CONTRACTOR:   [...WORKSPACE_TABS],
  CONSULTANT:   ["overview", "schedule", "cost", "risk", "safety", "quality", "documents", "reports"],
  CLIENT:       ["overview", "schedule", "cost", "risk", "safety", "quality", "documents"],
  SUBCONTRACTOR:["overview", "daily", "schedule", "cost", "risk", "safety", "quality", "documents"],
  SUPPLIER:     ["overview", "documents", "procurement"],
  REGULATOR:    ["overview", "reports"],
};

/**
 * Layer-2 role permissions: the tabs a functional role is permitted to access
 * regardless of party. The actual allowed tabs = PARTY_TAB_CEILING ∩ ROLE_TAB_PERMISSIONS.
 *
 * Design rules:
 *  - Executive roles (ADMIN, SENIOR_PM, DEPUTY_PM) get everything the party permits.
 *  - Specialist roles are narrowed to their functional domain only.
 *  - No role can exceed its party ceiling (enforced by the intersection).
 */
const ROLE_TAB_PERMISSIONS: Record<UserRole, WorkspaceTab[]> = {
  // ---- Executive / Management -------------------------------------------
  ADMIN:              [...WORKSPACE_TABS],
  SENIOR_PM:          [...WORKSPACE_TABS],
  DEPUTY_PM:          ["overview", "wbs", "daily", "schedule", "cost", "risk", "safety",
                       "quality", "resources", "engineering", "documents", "procurement", "reports"],

  // ---- Site-facing roles ------------------------------------------------
  // Superintendent: operational oversight — cost & procurement visible but not margin
  SUPERINTENDENT:     ["overview", "wbs", "daily", "schedule", "cost", "risk", "safety",
                       "quality", "resources", "engineering", "documents"],

  // Site Engineer: field execution, design, and QC — no commercial financials
  SITE_ENGINEER:      ["overview", "wbs", "daily", "schedule", "quality",
                       "resources", "engineering", "documents"],

  // Foreman: field crew only — no cost, no procurement, no reports
  FOREMAN:            ["overview", "wbs", "daily", "quality", "safety", "resources"],

  // ---- Quality & Safety -------------------------------------------------
  QC_INSPECTOR:       ["overview", "wbs", "quality", "documents", "reports"],
  HSE_OFFICER:        ["overview", "wbs", "safety", "risk", "documents", "reports"],

  // ---- Commercial / Finance roles ----------------------------------------
  QS:                 ["overview", "wbs", "cost", "schedule", "engineering", "documents", "reports"],
  FINANCE:            ["overview", "cost", "documents", "reports"],
  CONTRACTS_LEGAL:    ["overview", "wbs", "cost", "risk", "documents", "reports"],

  // ---- Procurement & Resources ------------------------------------------
  PROCUREMENT:        ["overview", "procurement", "resources", "documents"],
  EQUIPMENT_MANAGER:  ["overview", "resources", "daily", "documents"],
  HR:                 ["overview", "resources", "documents"],

  // ---- Consultant / Client-side roles -----------------------------------
  CONSULTANT_ENGINEER:["overview", "schedule", "cost", "risk", "safety", "quality", "documents", "reports"],
  CLIENT_REP:         ["overview", "schedule", "cost", "risk", "safety", "quality", "documents"],
};

/**
 * Returns the ordered list of workspace tabs a user may access on this project.
 * Result = PARTY_TAB_CEILING[partyType] ∩ ROLE_TAB_PERMISSIONS[role],
 * preserving the canonical WORKSPACE_TABS order.
 */
export function getWorkspaceTabs(partyType: PartyType, role: UserRole): WorkspaceTab[] {
  const partyCeiling = new Set(PARTY_TAB_CEILING[partyType] ?? ["overview"]);
  const rolePermitted = new Set(ROLE_TAB_PERMISSIONS[role] ?? ["overview"]);
  return WORKSPACE_TABS.filter((tab) => partyCeiling.has(tab) && rolePermitted.has(tab));
}

/** Subcontractors only see WBS nodes within their contracted scope. */
export function isScopedParty(partyType: PartyType): boolean {
  return partyType === "SUBCONTRACTOR" || partyType === "SUPPLIER";
}

// ---------------------------------------------------------------
// Layer 2 — functional-role write/approve authority.
// ---------------------------------------------------------------

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
];

const DAILY_ENTRY_ROLES: UserRole[] = ["FOREMAN", "SITE_ENGINEER"];

export function canEnterDailyReport(role: UserRole): boolean {
  return DAILY_ENTRY_ROLES.includes(role);
}

/**
 * Daily report sign-off chain (file 06 §5): prepared by Foreman/Site Engineer
 * (recorded as `createdById`), then approved in sequence by Superintendent →
 * Deputy PM → Senior PM. A report is APPROVED once all three approvers sign.
 */
export const DAILY_SIGN_OFF_CHAIN: UserRole[] = [
  "SUPERINTENDENT",
  "DEPUTY_PM",
  "SENIOR_PM",
];

export function canSignOffDailyReport(role: UserRole): boolean {
  return (
    role === "SUPERINTENDENT" ||
    role === "DEPUTY_PM" ||
    role === "SENIOR_PM"
  );
}

/**
 * Who may log a hazard/observation on the daily safety log. This is
 * deliberately the same site-facing set as SITE_FACING_ROLES (file 04 §4:
 * "site engineer/foreman logs actual progress ... any hazards observed"),
 * not "anyone in the contractor org" — Finance/HR/Procurement staff at the
 * contractor org should not be able to write safety records.
 */
export function canLogSafetyObservation(role: UserRole): boolean {
  return SITE_FACING_ROLES.includes(role);
}

/**
 * Escalating an observation into a formal SafetyIncident is a higher-stakes
 * action than logging a hazard, so it's narrowed to supervisory/HSE roles
 * rather than the full site-facing set.
 */
export function canEscalateSafetyIncident(role: UserRole): boolean {
  return role === "HSE_OFFICER" || role === "SUPERINTENDENT";
}

export function canCloseSafetyIncident(role: UserRole): boolean {
  return role === "HSE_OFFICER";
}

export function canFlagActivityBlocked(role: UserRole): boolean {
  return role === "HSE_OFFICER";
}

export function canApproveScheduleBaseline(role: UserRole): boolean {
  return role === "SENIOR_PM";
}

export function canRecordStoppage(role: UserRole): boolean {
  return ["FOREMAN", "SITE_ENGINEER", "SUPERINTENDENT"].includes(role);
}

/** Consultant certifies measurements; only consultant-side users may advance status. */
export function canCertifyMeasurement(partyType: PartyType, role: UserRole): boolean {
  return partyType === "CONSULTANT" && role === "CONSULTANT_ENGINEER";
}

// ---------------------------------------------------------------
// Phase 2 — Cost & Payments (spec Module 2; file 03 §Module 2).
// ---------------------------------------------------------------

const BOQ_EDIT_ROLES: UserRole[] = ["QS", "SITE_ENGINEER"];
const COST_RECORD_ROLES: UserRole[] = ["QS", "FINANCE"];
const IPC_PREPARE_ROLES: UserRole[] = ["QS", "SITE_ENGINEER"];
const IPC_REVIEW_ROLES: UserRole[] = ["SITE_ENGINEER", "SUPERINTENDENT"];
const IPC_PAY_ROLES: UserRole[] = ["FINANCE"];
const VARIATION_PREPARE_ROLES: UserRole[] = ["QS", "SITE_ENGINEER", "CONTRACTS_LEGAL"];
const VARIATION_CONTRACTOR_CHECK_ROLES: UserRole[] = ["CONTRACTS_LEGAL", "DEPUTY_PM", "SENIOR_PM"];

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

/**
 * Cost party lens (file 09 §8): the contractor sees full cost incl. margin;
 * consultant sees measured/certified value only; client sees certified +
 * payment status only.
 */
export function canSeeMargin(partyType: PartyType): boolean {
  return partyType === "CONTRACTOR";
}

export function canSeeCostVariance(partyType: PartyType): boolean {
  return partyType === "CONTRACTOR" || partyType === "CONSULTANT";
}

// ---------------------------------------------------------------
// Phase 2 — Risk register.
// ---------------------------------------------------------------

const RISK_ENTRY_ROLES: UserRole[] = [
  "SITE_ENGINEER",
  "SUPERINTENDENT",
  "QS",
  "DEPUTY_PM",
  "SENIOR_PM",
  "CONTRACTS_LEGAL",
  "HSE_OFFICER",
  "PROCUREMENT",
];
const RISK_CLOSE_ROLES: UserRole[] = ["SENIOR_PM", "DEPUTY_PM"];

export function canCreateRisk(role: UserRole): boolean {
  return RISK_ENTRY_ROLES.includes(role);
}

export function canCloseRisk(role: UserRole): boolean {
  return RISK_CLOSE_ROLES.includes(role);
}

export function canEscalateRisk(role: UserRole): boolean {
  return RISK_CLOSE_ROLES.includes(role);
}

// ---------------------------------------------------------------
// Phase 2 — Engineering / Takeoff.
// ---------------------------------------------------------------

const ENGINEERING_EDIT_ROLES: UserRole[] = ["SITE_ENGINEER", "SUPERINTENDENT"];
const ELEMENT_PROGRESS_ROLES: UserRole[] = ["FOREMAN", "SITE_ENGINEER", "SUPERINTENDENT"];

export function canEditEngineering(role: UserRole): boolean {
  return ENGINEERING_EDIT_ROLES.includes(role);
}

export function canRecordElementProgress(role: UserRole): boolean {
  return ELEMENT_PROGRESS_ROLES.includes(role);
}

// ---------------------------------------------------------------
// Phase 2 — Quality (ITR, defect log, punch list).
// ---------------------------------------------------------------

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

// ---------------------------------------------------------------
// Phase 2 — Resources (materials, equipment, labor, custody).
// ---------------------------------------------------------------

export function canManageMaterials(role: UserRole): boolean {
  return ["PROCUREMENT", "SITE_ENGINEER", "SUPERINTENDENT"].includes(role);
}

export function canManageEquipment(role: UserRole): boolean {
  return ["EQUIPMENT_MANAGER", "SUPERINTENDENT"].includes(role);
}

export function canRecordLabor(role: UserRole): boolean {
  return ["HR", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

export function canRecordCustody(role: UserRole): boolean {
  return ["PROCUREMENT", "EQUIPMENT_MANAGER", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

// ---------------------------------------------------------------
// Phase 2 — Procurement (POs, receipts, bid/tender registry).
// ---------------------------------------------------------------

export function canManagePurchaseOrders(role: UserRole): boolean {
  return ["PROCUREMENT", "SENIOR_PM"].includes(role);
}

export function canApprovePurchaseOrder(role: UserRole): boolean {
  return ["SENIOR_PM", "DEPUTY_PM"].includes(role);
}

export function canRecordReceipt(role: UserRole): boolean {
  return ["PROCUREMENT", "FOREMAN", "SITE_ENGINEER"].includes(role);
}

export function canManageBids(role: UserRole): boolean {
  return ["CONTRACTS_LEGAL", "PROCUREMENT", "SENIOR_PM"].includes(role);
}

// ---------------------------------------------------------------
// Phase 2 — Document repository & decision log.
// ---------------------------------------------------------------

const DOC_ISSUE_ROLES: UserRole[] = [
  "SITE_ENGINEER",
  "SENIOR_PM",
  "DEPUTY_PM",
  "QS",
  "CONTRACTS_LEGAL",
  "QC_INSPECTOR",
  "HSE_OFFICER",
];

export function canIssueDocument(role: UserRole): boolean {
  return DOC_ISSUE_ROLES.includes(role);
}

export function canApproveDocument(partyType: PartyType, role: UserRole): boolean {
  if (partyType === "CONSULTANT") return role === "CONSULTANT_ENGINEER";
  return role === "SENIOR_PM" || role === "DEPUTY_PM";
}

export function canRecordDecision(role: UserRole): boolean {
  return ["SENIOR_PM", "DEPUTY_PM", "CONSULTANT_ENGINEER"].includes(role);
}

export function canRecordLessons(role: UserRole): boolean {
  return role !== "CLIENT_REP";
}

// ---------------------------------------------------------------
// Phase 2 — Reports / compliance exports.
// ---------------------------------------------------------------

export function canGenerateReport(role: UserRole): boolean {
  return [
    "SENIOR_PM",
    "FINANCE",
    "QS",
    "HSE_OFFICER",
    "QC_INSPECTOR",
    "CONSULTANT_ENGINEER",
    "ADMIN",
  ].includes(role);
}

/**
 * Report-type visibility by party (file 09 §2): GRADING_RENEWAL exposes the
 * contractor's license/tax ID, staffing, and equipment counts — internal
 * company data, not project data — so it must stay contractor-side even
 * though CONSULTANT_ENGINEER otherwise has report-generation rights.
 * SAFETY_COMPLIANCE and PROGRESS_SUBMISSION are legitimately cross-party
 * (consultant certifies progress/safety), subject to the cost-visibility
 * filtering in canSeeMargin/canSeeCostVariance applied to their contents.
 */
export function canAccessReportType(
  partyType: PartyType,
  reportType: "GRADING_RENEWAL" | "PROGRESS_SUBMISSION" | "SAFETY_COMPLIANCE" | "OTHER"
): boolean {
  if (reportType === "GRADING_RENEWAL") return partyType === "CONTRACTOR";
  return true;
}