import type { UserRole, PartyType } from "@/generated/prisma/enums";
import { can } from "@/lib/permissions";
import type { WorkspaceTab } from "@/lib/constants";

/**
 * Map from permission resource names to workspace tab names.
 * Multiple resources can map to the same tab (e.g. "labor"+"equipment" → "resources").
 */
const RESOURCE_TO_TAB: Record<string, WorkspaceTab> = {
  wbs: "wbs",
  schedule: "schedule",
  daily_report: "daily",
  quality: "quality",
  safety: "safety",
  cost: "cost",
  procurement: "procurement",
  labor: "resources",
  document: "documents",
  risk: "risk",
  team: "team",
  engineering: "engineering",
};

/**
 * Extra tabs that don't have a 1:1 resource in the permission matrix
 * but are always available to all project members.
 */
const ALWAYS_VISIBLE: WorkspaceTab[] = ["overview", "settings"];

/**
 * Compute which workspace tabs a user role can see on a project.
 * Determined by mapping permission resources → workspace tabs.
 */
export function getAllowedTabs(role: UserRole): WorkspaceTab[] {
  const tabSet = new Set<WorkspaceTab>(ALWAYS_VISIBLE);

  for (const [resource, tab] of Object.entries(RESOURCE_TO_TAB)) {
    if (can(role, resource as any, "read")) {
      tabSet.add(tab);
    }
  }

  return Array.from(tabSet);
}

/**
 * Determine the user's party type within the context of a project.
 * Looks at which organization "owns" the project relative to the user's org.
 */
export function resolveProjectParty(
  userPartyType: PartyType,
  userOrganizationId: string,
  project: {
    contractorOrgId?: string | null;
    clientOrgId?: string | null;
    consultantOrgId?: string | null;
  }
): PartyType {
  if (project.contractorOrgId === userOrganizationId) {
    return "CONTRACTOR";
  }
  if (project.clientOrgId === userOrganizationId) {
    return "CLIENT";
  }
  if (project.consultantOrgId === userOrganizationId) {
    return "CONSULTANT";
  }
  return userPartyType;
}