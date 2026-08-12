import { db } from "@/lib/db";
import { getDescendantIds } from "@/lib/scope/wbs-tree";

export type OversightContext = {
  assignments: Array<{
    id: string;
    contractId: string;
    scopeWbsNodeId: string;
  }>;
  /** Every WBS node inside any branch this user oversees. */
  visibleWbsNodeIds: Set<string>;
  contractIds: Set<string>;
};

const EMPTY: OversightContext = {
  assignments: [],
  visibleWbsNodeIds: new Set(),
  contractIds: new Set(),
};

/**
 * A user's oversight footprint on a project (file 20 §5.4).
 *
 * Lives in the scope layer rather than the oversight service because Layer 3
 * consumes it on every request — keeping it here avoids the scope layer
 * depending on a service that in turn depends on scope.
 *
 * Only oversight over ACTIVE contracts counts: when a subcontract is terminated,
 * the watcher's derived visibility ends with it, the same way the
 * subcontractor's own access does (file 18 §2.4).
 */
export async function getOversightContext(
  userId: string,
  projectId: string
): Promise<OversightContext> {
  const assignments = await db.oversightAssignment.findMany({
    where: {
      projectId,
      userId,
      endedAt: null,
      contract: { status: "ACTIVE" },
    },
    select: { id: true, contractId: true, scopeWbsNodeId: true },
  });

  if (assignments.length === 0) return EMPTY;

  const visibleWbsNodeIds = await getDescendantIds(
    assignments.map((a) => a.scopeWbsNodeId)
  );

  return {
    assignments,
    visibleWbsNodeIds,
    contractIds: new Set(assignments.map((a) => a.contractId)),
  };
}
