import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import type { OrganizationScope } from "@/lib/scope/types";
import { getDescendantIds } from "@/lib/scope/wbs-tree";

/**
 * Layer 1 — party / organization ceiling for a project.
 * Does not apply individual assignment narrowing.
 */
export async function getOrganizationScope(
  user: SessionUser,
  projectId: string
): Promise<OrganizationScope> {
  const party = user.partyType;

  if (party === "SUPPLIER") {
    return {
      visibleWbsNodeIds: new Set(),
      canViewCostDetail: false,
      canViewOperationalData: false,
      fieldMode: "full",
      scopeMode: "procurement_own",
    };
  }

  if (party === "SUBCONTRACTOR") {
    const contracts = await db.contract.findMany({
      where: {
        projectId,
        contractorOrgId: user.organizationId,
        status: "ACTIVE",
        scopeWbsNodeId: { not: null },
      },
      select: { scopeWbsNodeId: true },
    });
    const roots = contracts
      .map((c) => c.scopeWbsNodeId)
      .filter((id): id is string => Boolean(id));
    const visible = await getDescendantIds(roots);
    return {
      visibleWbsNodeIds: visible,
      canViewCostDetail: false,
      canViewOperationalData: true,
      fieldMode: "full",
      scopeMode: "wbs",
    };
  }

  if (party === "CONSULTANT") {
    return {
      visibleWbsNodeIds: "ALL",
      canViewCostDetail: false,
      canViewOperationalData: true,
      fieldMode: "full",
      scopeMode: "wbs",
    };
  }

  if (party === "CLIENT") {
    return {
      visibleWbsNodeIds: "ALL",
      canViewCostDetail: false,
      canViewOperationalData: false,
      fieldMode: "client_summary",
      scopeMode: "wbs",
    };
  }

  if (party === "REGULATOR") {
    return {
      visibleWbsNodeIds: "ALL",
      canViewCostDetail: false,
      canViewOperationalData: false,
      fieldMode: "regulator_compliance",
      scopeMode: "wbs",
    };
  }

  // CONTRACTOR (default)
  return {
    visibleWbsNodeIds: "ALL",
    canViewCostDetail: true,
    canViewOperationalData: true,
    fieldMode: "full",
    scopeMode: "wbs",
  };
}
