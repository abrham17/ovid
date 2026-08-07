import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";

type CreateDisputeInput = {
  projectId: string;
  defectLogId?: string;
  itrId?: string;
  wbsNodeId?: string;
  reason: string;
  escalationTo?: string;
};

/** Open a dispute against a QC fail result */
export async function createDispute(
  user: SessionUser,
  input: CreateDisputeInput
) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "dispute", "create");

  if (!input.defectLogId && !input.itrId) {
    throw new DomainError("A dispute must reference either a defect log or an inspection test record", 400);
  }

  return db.disputeRecord.create({
    data: {
      projectId: input.projectId,
      defectLogId: input.defectLogId,
      itrId: input.itrId,
      wbsNodeId: input.wbsNodeId,
      reason: input.reason,
      disputedById: user.id,
      escalationTo: input.escalationTo,
      status: "OPEN",
    },
    include: {
      disputedBy: { select: { id: true, fullName: true, role: true } },
      defectLog: { select: { id: true, description: true, status: true } },
      itr: { select: { id: true, result: true, inspectionType: true } },
    },
  });
}

/** Resolve a dispute (add resolution) */
export async function resolveDispute(
  user: SessionUser,
  disputeId: string,
  resolution: string,
  resolvedStatus: "UNDER_REVIEW" | "RESOLVED"
) {
  const dispute = await db.disputeRecord.findUnique({
    where: { id: disputeId },
    select: { projectId: true, status: true },
  });
  if (!dispute) throw new DomainError("Dispute not found", 404);
  await assertProjectAccess(user, dispute.projectId);
  assertPermission(user, "dispute", "update");

  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new DomainError("Dispute must be OPEN or UNDER_REVIEW to resolve", 400);
  }

  return db.disputeRecord.update({
    where: { id: disputeId },
    data: {
      resolution,
      status: resolvedStatus,
      resolvedById: user.id,
      resolvedAt: new Date(),
    },
  });
}

/** List disputes for a project */
export async function listDisputes(
  user: SessionUser,
  projectId: string,
  status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED"
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "dispute", "read");

  return db.disputeRecord.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      disputedBy: { select: { id: true, fullName: true, role: true } },
      resolvedBy: { select: { id: true, fullName: true, role: true } },
      defectLog: { select: { id: true, description: true, status: true } },
      itr: { select: { id: true, result: true, inspectionType: true } },
      wbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

/** Get a single dispute */
export async function getDispute(
  user: SessionUser,
  disputeId: string
) {
  const dispute = await db.disputeRecord.findUnique({
    where: { id: disputeId },
    include: {
      disputedBy: { select: { id: true, fullName: true, role: true } },
      resolvedBy: { select: { id: true, fullName: true, role: true } },
      defectLog: { select: { id: true, description: true, status: true } },
      itr: { select: { id: true, result: true, inspectionType: true } },
      wbsNode: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!dispute) throw new DomainError("Dispute not found", 404);
  assertPermission(user, "dispute", "read");
  return dispute;
}