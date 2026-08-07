import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import { Prisma } from "@/generated/prisma/client";

type CreateContractInput = {
  projectId: string;
  contractorOrgId: string;
  parentContractId?: string;
  scopeWbsNodeId: string;
  scopeDescription: string;
  contractValue: number;
  retentionPercent?: number;
};

/** Validate no branch-overlap: ensure the WBS node (and its subtree) is not already
 *  the scope of another active contract. Allows nested subcontracts with an explicit
 *  parentContractId. */
async function assertNoBranchOverlap(
  wbsNodeId: string,
  projectId: string,
  excludeContractId?: string
) {
  // Walk ancestors of the proposed node — if any is a scope root, warn
  const ancestors = await db.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE wbs_ancestors AS (
      SELECT id, parent_id FROM "WBSNode" WHERE id = ${wbsNodeId}
      UNION ALL
      SELECT w.id, w.parent_id FROM "WBSNode" w
      INNER JOIN wbs_ancestors wa ON w.id = wa.parent_id
    )
    SELECT id FROM wbs_ancestors
    WHERE id != ${wbsNodeId};
  `;

  const conflict = await db.contract.findFirst({
    where: {
      projectId,
      scopeWbsNodeId: { in: [wbsNodeId, ...ancestors.map((a) => a.id)] },
      status: "ACTIVE",
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: { id: true, contractorOrg: { select: { name: true } } },
  });

  if (conflict) {
    throw new DomainError(
      `Branch overlap: WBS node or an ancestor is already assigned to ${conflict.contractorOrg.name} under contract ${conflict.id}`,
      409
    );
  }

  // Also check descendants — use separate query to avoid raw SQL interpolation issues
  if (!excludeContractId) {
    const descendantConflict = await db.$queryRaw<Array<{ id: string }>>`
      WITH RECURSIVE wbs_descendants AS (
        SELECT id, parent_id FROM "WBSNode" WHERE parent_id = ${wbsNodeId}
        UNION ALL
        SELECT w.id, w.parent_id FROM "WBSNode" w
        INNER JOIN wbs_descendants wd ON w.parent_id = wd.id
      )
      SELECT c.id FROM "Contract" c
      INNER JOIN wbs_descendants wd ON c.scope_wbs_node_id = wd.id
      WHERE c.project_id = ${projectId} AND c.status = 'ACTIVE';
    `;

    if (descendantConflict.length > 0) {
      throw new DomainError(
        `Branch overlap: a descendant WBS node is already assigned to another active contract`,
        409
      );
    }
  }
}

/** Create a new subcontract — this is the act of assigning WBS scope to a subcontractor */
export async function createContract(
  user: SessionUser,
  input: CreateContractInput
) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "project", "update");

  await assertNoBranchOverlap(input.scopeWbsNodeId, input.projectId);

  const wbsNode = await db.wbsNode.findUnique({
    where: { id: input.scopeWbsNodeId },
    select: { id: true, projectId: true },
  });
  if (!wbsNode) throw new DomainError("WBS node not found", 404);

  return db.contract.create({
    data: {
      projectId: input.projectId,
      contractorOrgId: input.contractorOrgId,
      parentContractId: input.parentContractId,
      scopeWbsNodeId: input.scopeWbsNodeId,
      scopeDescription: input.scopeDescription,
      contractValue: input.contractValue,
      retentionPercent: input.retentionPercent ?? 5,
      status: "ACTIVE",
    },
    include: {
      contractorOrg: { select: { id: true, name: true, partyType: true } },
      scopeWbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

/** Terminate a contract — ends scope visibility for that subcontractor's staff */
export async function terminateContract(
  user: SessionUser,
  contractId: string,
  replacementContractorOrgId?: string
) {
  const contract = await db.contract.findUnique({
    where: { id: contractId },
    select: { projectId: true, status: true },
  });
  if (!contract) throw new DomainError("Contract not found", 404);
  await assertProjectAccess(user, contract.projectId);
  assertPermission(user, "project", "update");

  if (contract.status !== "ACTIVE") {
    throw new DomainError("Only ACTIVE contracts can be terminated", 400);
  }

  // If a replacement contractor is specified, create a new contract that supersedes this one
  if (replacementContractorOrgId) {
    const original = await db.contract.findUnique({
      where: { id: contractId },
      select: {
        projectId: true,
        scopeWbsNodeId: true,
        scopeDescription: true,
        contractValue: true,
        retentionPercent: true,
        parentContractId: true,
      },
    });
    if (!original) throw new DomainError("Original contract not found", 404);

    await db.contract.create({
      data: {
        projectId: original.projectId,
        contractorOrgId: replacementContractorOrgId,
        parentContractId: original.parentContractId,
        scopeWbsNodeId: original.scopeWbsNodeId,
        scopeDescription: `Replacement for ${contractId}: ${original.scopeDescription}`,
        contractValue: original.contractValue,
        retentionPercent: original.retentionPercent,
        supersedesContractId: contractId,
        status: "ACTIVE",
      },
    });
  }

  return db.contract.update({
    where: { id: contractId },
    data: { status: "TERMINATED", terminatedAt: new Date() },
  });
}

/** List all contracts for a project */
export async function listContracts(
  user: SessionUser,
  projectId: string
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "project", "read");

  return db.contract.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      contractorOrg: { select: { id: true, name: true, partyType: true } },
      scopeWbsNode: { select: { id: true, code: true, name: true } },
      supersedes: { select: { id: true, status: true, contractorOrg: { select: { name: true } } } },
      _count: { select: { measurements: true } },
    },
  });
}

/** Get contract by id with full relations */
export async function getContract(
  user: SessionUser,
  contractId: string
) {
  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: {
      project: { select: { id: true, code: true, name: true } },
      contractorOrg: { select: { id: true, name: true, partyType: true, contractorGrade: true } },
      scopeWbsNode: { select: { id: true, code: true, name: true, nodeType: true } },
      parentContract: { select: { id: true, contractorOrg: { select: { name: true } } } },
      subcontracts: { select: { id: true, contractorOrg: { select: { name: true } }, status: true } },
      supersedes: { select: { id: true, status: true } },
      supersededBy: { select: { id: true, status: true, contractorOrg: { select: { name: true } } } },
      measurements: {
        select: { id: true, itemNo: true, quantity: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!contract) throw new DomainError("Contract not found", 404);
  await assertProjectAccess(user, contract.project.id);
  assertPermission(user, "project", "read");

  return contract;
}

/**
 * Assert that the user's organization has contractual scope access to a WBS node.
 * Main-contractor users (CONTRACTOR party) always pass.
 * Subcontractor users must have an ACTIVE contract whose scopeWbsNodeId is
 * an ancestor of (or equal to) the given wbsNodeId.
 */
export async function assertScopeAccess(
  user: SessionUser,
  wbsNodeId: string
): Promise<void> {
  // Main contractor always has full scope access
  if (user.partyType === "CONTRACTOR") return;

  // For subcontractors, check their organization has an ACTIVE contract covering this node
  const ancestorIds = await db.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE wbs_ancestors AS (
      SELECT id, parent_id FROM "WBSNode" WHERE id = ${wbsNodeId}
      UNION ALL
      SELECT w.id, w.parent_id FROM "WBSNode" w
      INNER JOIN wbs_ancestors wa ON w.id = wa.parent_id
    )
    SELECT id FROM wbs_ancestors;
  `;

  const hasScope = await db.contract.findFirst({
    where: {
      contractorOrgId: user.organizationId,
      scopeWbsNodeId: { in: [wbsNodeId, ...ancestorIds.map((a) => a.id)] },
      status: "ACTIVE",
    },
  });

  if (!hasScope) {
    throw new DomainError(
      "Your organization does not have contractual scope over this WBS node",
      403
    );
  }
}