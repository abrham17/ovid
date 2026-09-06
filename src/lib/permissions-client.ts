import type { UserRole } from "@/generated/prisma/enums";

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

export function can(
  role: UserRole,
  resource: Resource,
  action: PermissionAction
): boolean {
  const perms = ROLE_PERMISSIONS[role]?.[resource];
  if (!perms) return false;
  return perms.includes(action);
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
