import type { UserRole } from "@/generated/prisma/enums";

const ALL_ROLES: UserRole[] = [
  "FOREMAN",
  "SUPERINTENDENT",
  "SITE_ENGINEER",
  "DEPUTY_PM",
  "SENIOR_PM",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "QS",
  "PROCUREMENT",
  "FINANCE",
  "HR",
  "EQUIPMENT_MANAGER",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "ADMIN",
];

const NON_ADMIN_ROLES = ALL_ROLES.filter((role) => role !== "ADMIN");

/** Inviter role → invitee roles they may assign (same-org unless ADMIN). */
export const INVITE_PERMISSIONS: Partial<Record<UserRole, UserRole[]>> = {
  ADMIN: ALL_ROLES,
  SENIOR_PM: NON_ADMIN_ROLES,
  DEPUTY_PM: NON_ADMIN_ROLES,
  HR: NON_ADMIN_ROLES,
  SUPERINTENDENT: ["FOREMAN", "SITE_ENGINEER", "HSE_OFFICER", "QC_INSPECTOR"],
};

export function canInviteUsers(role: UserRole): boolean {
  return Boolean(INVITE_PERMISSIONS[role]?.length);
}

export function canInviteRole(inviter: UserRole, invitee: UserRole): boolean {
  return INVITE_PERMISSIONS[inviter]?.includes(invitee) ?? false;
}

export function inviteableRolesFor(inviter: UserRole): UserRole[] {
  return INVITE_PERMISSIONS[inviter] ?? [];
}

export { ALL_ROLES };
