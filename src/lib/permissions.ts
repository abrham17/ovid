import type { UserRole, PartyType, CompanyStaffRole } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Permission matrix for Ovid PMS.
 * Aligned with Ethiopian Grade-1 construction practice and typical FIDIC roles.
 *
 * Legend:
 *   R  = Read
 *   C  = Create
 *   U  = Update
 *   D  = Delete / Void
 *   A  = Approve / Sign-off
 */

export type PermissionAction = "read" | "create" | "update" | "delete" | "approve";

export type Resource =
  | "project"
  | "wbs"
  | "schedule"
  | "daily_report"
  | "quality"
  | "safety"
  | "cost"
  | "measurement"
  | "variation"
  | "procurement"
  | "labor"
  | "equipment"
  | "document"
  | "risk"
  | "team"
  | "invitation"
  | "admin"
  | "notification"
  | "assignment"
  | "dispute"
  | "contract";

export type CompanyResource =
  | "company_staff"
  | "portfolio"
  | "tendering"
  | "project_approval"
  | "contractor_onboarding"
  | "legal_escalation"
  | "planning_monitoring"
  | "engineering_standards"
  | "equipment_capital"
  | "finance_approval"
  | "audit_compliance"
  | "audit_findings"
  | "executive_intervention"
  | "executive_approval";

/** Role capabilities — conservative defaults; refine per organisation policy */
const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<Resource, PermissionAction[]>>> = {
  FOREMAN: {
    daily_report: ["read", "create", "update"],
    safety: ["read", "create"],
    quality: ["read"],
    labor: ["read", "create", "update"],
    equipment: ["read"],
    schedule: ["read", "create"],
    wbs: ["read"],
    project: ["read"],
    assignment: ["read"],
    notification: ["read"],
  },
  SUPERINTENDENT: {
    daily_report: ["read", "create", "update", "approve"],
    safety: ["read", "create", "update"],
    quality: ["read", "create"],
    labor: ["read", "create", "update"],
    equipment: ["read", "create", "update"],
    schedule: ["read", "create", "update"],
    wbs: ["read"],
    project: ["read"],
    invitation: ["read", "create", "delete"],
    assignment: ["read", "create", "update"],
    notification: ["read"],
  },
  SITE_ENGINEER: {
    daily_report: ["read", "create", "update"],
    safety: ["read", "create"],
    quality: ["read", "create", "update"],
    schedule: ["read", "create", "update"],
    wbs: ["read", "update"],
    cost: ["read"],
    document: ["read", "create"],
    project: ["read"],
    assignment: ["read", "create", "update"],
    dispute: ["read", "create"],
    notification: ["read"],
  },
  DEPUTY_PM: {
    project: ["read", "update"],
    wbs: ["read", "create", "update"],
    schedule: ["read", "create", "update"],
    daily_report: ["read", "approve"],
    quality: ["read", "approve"],
    safety: ["read", "approve"],
    cost: ["read", "update"],
    measurement: ["read", "create", "update"],
    variation: ["read", "create", "update"],
    procurement: ["read", "approve"],
    labor: ["read"],
    equipment: ["read"],
    document: ["read", "create", "update", "approve"],
    risk: ["read", "create", "update"],
    team: ["read"],
    assignment: ["read", "create", "update"],
    dispute: ["read", "update"],
    contract: ["read"],
    notification: ["read"],
  },
  SENIOR_PM: {
    project: ["read", "create", "update"],
    wbs: ["read", "create", "update", "delete"],
    schedule: ["read", "create", "update", "delete"],
    daily_report: ["read", "approve"],
    quality: ["read", "approve"],
    safety: ["read", "approve"],
    cost: ["read", "create", "update", "approve"],
    measurement: ["read", "create", "update", "approve"],
    variation: ["read", "create", "update", "approve"],
    procurement: ["read", "approve"],
    labor: ["read"],
    equipment: ["read"],
    document: ["read", "create", "update", "approve"],
    risk: ["read", "create", "update", "approve"],
    team: ["read", "create", "update"],
    invitation: ["read", "create", "delete"],
    assignment: ["read", "create", "update", "delete"],
    dispute: ["read", "create", "update", "approve"],
    contract: ["read", "create", "update", "approve"],
    notification: ["read"],
  },
  QC_INSPECTOR: {
    quality: ["read", "create", "update", "approve"],
    daily_report: ["read"],
    document: ["read", "create"],
    project: ["read"],
    schedule: ["read"],
    wbs: ["read"],
    dispute: ["read"],
    notification: ["read"],
  },
  HSE_OFFICER: {
    safety: ["read", "create", "update", "approve"],
    daily_report: ["read"],
    labor: ["read"],
    project: ["read"],
    document: ["read", "create"],
    notification: ["read"],
  },
  QS: {
    cost: ["read", "create", "update"],
    measurement: ["read", "create", "update"],
    variation: ["read", "create", "update"],
    procurement: ["read"],
    wbs: ["read"],
    schedule: ["read"],
    project: ["read"],
    document: ["read", "create"],
    notification: ["read"],
  },
  PROCUREMENT: {
    procurement: ["read", "create", "update"],
    cost: ["read"],
    project: ["read"],
    document: ["read", "create"],
    notification: ["read"],
  },
  FINANCE: {
    cost: ["read", "create", "update", "approve"],
    measurement: ["read", "approve"],
    variation: ["read"],
    procurement: ["read", "approve"],
    project: ["read"],
    document: ["read"],
    notification: ["read"],
  },
  HR: {
    labor: ["read", "create", "update", "delete"],
    team: ["read", "create", "update"],
    invitation: ["read", "create", "delete"],
    project: ["read"],
    notification: ["read"],
  },
  EQUIPMENT_MANAGER: {
    equipment: ["read", "create", "update", "delete"],
    project: ["read"],
    schedule: ["read"],
    notification: ["read"],
  },
  CONTRACTS_LEGAL: {
    document: ["read", "create", "update", "approve"],
    variation: ["read", "create", "update", "approve"],
    project: ["read", "update"],
    cost: ["read"],
    contract: ["read", "create", "update"],
    notification: ["read"],
  },
  CONSULTANT_ENGINEER: {
    quality: ["read", "approve"],
    measurement: ["read", "approve"],
    variation: ["read", "approve"],
    document: ["read", "approve"],
    schedule: ["read"],
    wbs: ["read"],
    project: ["read"],
    cost: ["read"],
    notification: ["read"],
  },
  CLIENT_REP: {
    project: ["read"],
    schedule: ["read"],
    cost: ["read"],
    measurement: ["read", "approve"],
    variation: ["read", "approve"],
    document: ["read"],
    quality: ["read"],
    safety: ["read"],
    risk: ["read"],
    notification: ["read"],
  },
  SUBCONTRACTOR_PM: {
    project: ["read"],
    wbs: ["read", "create", "update"],
    schedule: ["read", "create", "update"],
    daily_report: ["read", "approve"],
    quality: ["read"],
    safety: ["read", "create"],
    cost: ["read"],
    document: ["read", "create"],
    risk: ["read", "create"],
    labor: ["read"],
    equipment: ["read"],
    team: ["read", "create"],
    invitation: ["read", "create", "delete"],
    assignment: ["read", "create", "update"],
    notification: ["read"],
  },
  OFFICE_ENGINEER: {
    project: ["read"], wbs: ["read"], schedule: ["read"], daily_report: ["read", "create", "update"],
    document: ["read", "create", "update"], risk: ["read", "create"], variation: ["read", "create", "update"],
    procurement: ["read"], assignment: ["read", "create", "update"], dispute: ["read", "create"], notification: ["read"],
  },
  COMPANY_STAFF: { project: ["read"], wbs: ["read"], schedule: ["read"], daily_report: ["read"], quality: ["read"], safety: ["read"], cost: ["read"], measurement: ["read"], variation: ["read"], procurement: ["read"], labor: ["read"], equipment: ["read"], document: ["read"], risk: ["read"], contract: ["read"], notification: ["read"] },
  ADMIN: {
    project: ["read", "create", "update", "delete"],
    wbs: ["read", "create", "update", "delete"],
    schedule: ["read", "create", "update", "delete"],
    daily_report: ["read", "create", "update", "delete", "approve"],
    quality: ["read", "create", "update", "delete", "approve"],
    safety: ["read", "create", "update", "delete", "approve"],
    cost: ["read", "create", "update", "delete", "approve"],
    measurement: ["read", "create", "update", "delete", "approve"],
    variation: ["read", "create", "update", "delete", "approve"],
    procurement: ["read", "create", "update", "delete", "approve"],
    labor: ["read", "create", "update", "delete"],
    equipment: ["read", "create", "update", "delete"],
    document: ["read", "create", "update", "delete", "approve"],
    risk: ["read", "create", "update", "delete", "approve"],
    team: ["read", "create", "update", "delete"],
    invitation: ["read", "create", "update", "delete"],
    admin: ["read", "create", "update", "delete"],
    contract: ["read", "create", "update", "delete", "approve"],
    notification: ["read", "create"],
  },
};

export const COMPANY_ROLE_PERMISSIONS: Record<CompanyStaffRole, Partial<Record<CompanyResource, PermissionAction[]>>> = {
  GENERAL_MANAGER: { portfolio: ["read"], project_approval: ["approve"], contractor_onboarding: ["approve"], equipment_capital: ["approve"], audit_compliance: ["read"], executive_intervention: ["read", "create", "update", "approve"], executive_approval: ["read", "approve"] },
  LEGAL_SERVICE_MANAGER: { portfolio: ["read"], tendering: ["read", "update", "approve"], legal_escalation: ["read", "create", "approve"], executive_intervention: ["read", "update"] },
  HEAD_TENDERING: { portfolio: ["read"], tendering: ["read", "create", "update", "approve"], project_approval: ["create"], contractor_onboarding: ["create"], legal_escalation: ["read", "create"], executive_intervention: ["read", "update"] },
  TENDERING_OFFICER: { portfolio: ["read"], tendering: ["read", "create", "update"] },
  HEAD_PLANNING_MONITORING: { portfolio: ["read"], planning_monitoring: ["read", "create", "update"], executive_intervention: ["read", "update"] },
  PLANNING_OFFICER: { portfolio: ["read"], planning_monitoring: ["read", "update"], executive_intervention: ["read", "update"] },
  ENGINEERING_DEPT_MANAGER: { portfolio: ["read"], engineering_standards: ["read", "approve"], tendering: ["read", "approve"], equipment_capital: ["approve"], legal_escalation: ["approve"], executive_intervention: ["read", "update"] },
  HEAD_ENGINEERING_SERVICES: { portfolio: ["read"], engineering_standards: ["read", "create", "update", "approve"], executive_intervention: ["read", "update"] },
  ENGINEERING_SERVICES_OFFICER: { portfolio: ["read"], engineering_standards: ["read", "create", "update"] },
  EQUIPMENT_ADMIN_MANAGER: { portfolio: ["read"], equipment_capital: ["read", "create", "update"], executive_intervention: ["read", "update"] },
  FINANCE_DEPT_MANAGER: { portfolio: ["read"], finance_approval: ["read", "approve"], audit_compliance: ["read"], executive_intervention: ["read", "update"] },
  INTERNAL_AUDITOR: { audit_compliance: ["read"], audit_findings: ["read", "create", "update"], portfolio: ["read"] },
};

export function companyRoleCan(role: CompanyStaffRole, resource: CompanyResource, action: PermissionAction) {
  return COMPANY_ROLE_PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

export async function getActiveCompanyRoles(userId: string, organizationId: string): Promise<CompanyStaffRole[]> {
  const rows = await db.companyStaffAssignment.findMany({ where: { userId, organizationId, active: true }, select: { role: true } });
  return rows.map((r) => r.role);
}

export async function hasCompanyRole(user: SessionUser, role: CompanyStaffRole) {
  const roles = await getActiveCompanyRoles(user.id, user.organizationId);
  return roles.includes(role);
}

export async function canCompany(user: SessionUser, resource: CompanyResource, action: PermissionAction) {
  if (user.role === "ADMIN" && resource === "company_staff") return ["read", "create", "update", "delete"].includes(action);
  const roles = await getActiveCompanyRoles(user.id, user.organizationId);
  return roles.some((role) => COMPANY_ROLE_PERMISSIONS[role]?.[resource]?.includes(action));
}

export async function assertCompanyPermission(user: SessionUser, resource: CompanyResource, action: PermissionAction) {
  if (!(await canCompany(user, resource, action))) throw new PermissionError(`Company role cannot ${action} ${resource}`);
}

export function can(
  role: UserRole,
  resource: Resource,
  action: PermissionAction
): boolean {
  const perms = ROLE_PERMISSIONS[role]?.[resource];
  if (!perms) return false;
  return perms.includes(action);
}

export function assertPermission(
  user: SessionUser,
  resource: Resource,
  action: PermissionAction
) {
  if (!can(user.role, resource, action)) {
    throw new PermissionError(
      `Role ${user.role} cannot ${action} ${resource}`
    );
  }
}

export class PermissionError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Verify the user is a member of the given project (or is ADMIN of the same org).
 * Returns the membership record when present.
 */
export async function assertProjectAccess(
  user: SessionUser,
  projectId: string
) {
  if ((user.companyRoles?.length ?? 0) > 0 && await canCompany(user, "portfolio", "read")) {
    const project = await db.project.findFirst({ where: { id: projectId, OR: [{ contractorOrgId: user.organizationId }, { clientOrgId: user.organizationId }, { consultantOrgId: user.organizationId }] } });
    if (project) return { role: user.role as UserRole, project };
  }
  // ADMIN: any project linked to their org as contractor / client / consultant
  if (user.role === "ADMIN") {
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { contractorOrgId: user.organizationId },
          { clientOrgId: user.organizationId },
          { consultantOrgId: user.organizationId },
        ],
      },
    });
    if (!project) throw new PermissionError("Project not found or access denied");
    return { role: user.role as UserRole, project };
  }

  const membership = await db.projectMembership.findFirst({
    where: {
      projectId,
      userId: user.id,
    },
    include: { project: true },
  });

  if (!membership) {
    // Also allow same-org contractor staff without explicit membership for read paths
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { contractorOrgId: user.organizationId },
          { clientOrgId: user.organizationId },
          { consultantOrgId: user.organizationId },
        ],
      },
    });
    if (!project) throw new PermissionError("You are not a member of this project");
    return { role: user.role as UserRole, project };
  }

  return { role: (membership.projectRole as UserRole) || user.role, project: membership.project };
}

/** Roles that can invite new users into a project */
export const INVITE_CAPABLE_ROLES: UserRole[] = [
  "SENIOR_PM",
  "DEPUTY_PM",
  "SUPERINTENDENT",
  "HR",
  "ADMIN",
  "SUBCONTRACTOR_PM",
];

export function canInvite(role: UserRole) {
  return INVITE_CAPABLE_ROLES.includes(role);
}

/**
 * Get visible tabs for a given role based on read permissions.
 * Returns array of tab IDs that the role has read access to.
 */
export function getVisibleTabs(role: UserRole): string[] {
  const visibleTabs: string[] = [];

  // Tab to resource mapping
  const tabResources: Record<string, Resource> = {
    overview: "project",
    wbs: "wbs",
    schedule: "schedule",
    daily: "daily_report",
    safety: "safety",
    cost: "cost",
    risk: "risk",
    team: "team",
    quality: "quality",
    procurement: "procurement",
    documents: "document",
  };

  // Check each tab's corresponding resource
  for (const [tab, resource] of Object.entries(tabResources)) {
    if (can(role, resource, "read")) {
      visibleTabs.push(tab);
    }
  }

  // Resources tab: show if user has read access to labor OR equipment
  if (can(role, "labor", "read") || can(role, "equipment", "read")) {
    visibleTabs.push("resources");
  }

  return visibleTabs;
}
