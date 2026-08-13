import { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/domain-rules";
import { assertProjectAccess } from "@/lib/permissions";
import { assertScopeVisible, getEffectiveScope } from "@/lib/scope";
import { createNotification } from "@/lib/services/notification.service";
import { hasOversightOver } from "@/lib/services/oversight.service";
import type { CreateResourceRequestInput } from "@/lib/validations/workflows";

const PM_ROLES = new Set(["SENIOR_PM", "DEPUTY_PM", "ADMIN", "PROCUREMENT"]);

export async function listResourceRequests(user: SessionUser, projectId: string, status?: string) {
  await assertProjectAccess(user, projectId);
  const scope = await getEffectiveScope(user, projectId);
  const allowed = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "FULFILLED"] as const;
  const parsed = allowed.find((s) => s === status);
  return db.resourceRequest.findMany({
    where: { projectId, ...(parsed ? { status: parsed } : {}), ...(user.partyType === "SUBCONTRACTOR" ? { contract: { contractorOrgId: user.organizationId } } : !PM_ROLES.has(user.role) && scope.oversightContractIds.size ? { contractId: { in: [...scope.oversightContractIds] } } : {}) },
    include: { contract: { select: { id: true, scopeDescription: true, contractorOrg: { select: { name: true } } } }, wbsNode: { select: { id: true, code: true, name: true } }, requestedBy: { select: { id: true, fullName: true } }, reviewedBy: { select: { id: true, fullName: true } }, materialItem: { select: { id: true, name: true, unit: true } }, equipment: { select: { id: true, equipmentType: true, plateNo: true } } }, orderBy: { createdAt: "desc" },
  });
}

export async function createResourceRequest(user: SessionUser, projectId: string, input: CreateResourceRequestInput) {
  await assertProjectAccess(user, projectId);
  if (user.partyType !== "SUBCONTRACTOR") throw new DomainError("Only subcontractor staff may request contractor resources", 403);
  const contract = await db.contract.findFirst({ where: { id: input.contractId, projectId, contractorOrgId: user.organizationId, status: "ACTIVE" }, select: { id: true } });
  if (!contract) throw new DomainError("Active subcontract not found", 404);
  const scope = await getEffectiveScope(user, projectId); assertScopeVisible(scope, input.wbsNodeId);
  const request = await db.resourceRequest.create({ data: { projectId, contractId: input.contractId, wbsNodeId: input.wbsNodeId, kind: input.kind, materialItemId: input.materialItemId ?? null, equipmentId: input.equipmentId ?? null, description: input.description, quantity: new Prisma.Decimal(input.quantity), unit: input.unit ?? null, neededByDate: new Date(input.neededByDate), justification: input.justification, requestedById: user.id } });
  const holders = await db.oversightAssignment.findMany({ where: { contractId: input.contractId, endedAt: null }, select: { userId: true } });
  for (const holder of holders) await createNotification({ userId: holder.userId, projectId, type: "RESOURCE_REQUEST_PENDING", entityType: "ResourceRequest", entityId: request.id, message: `A subcontractor resource request needs your review: ${input.description}` });
  return request;
}

export async function reviewResourceRequest(user: SessionUser, requestId: string, decision: "APPROVE" | "REJECT", reason?: string) {
  const request = await db.resourceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new DomainError("Resource request not found", 404);
  await assertProjectAccess(user, request.projectId);
  if (!(await hasOversightOver(user.id, request.contractId)) && !PM_ROLES.has(user.role)) throw new DomainError("Only an active oversight holder may review this request", 403);
  if (request.status !== "PENDING") throw new DomainError("This request has already been reviewed", 400);
  if (decision === "REJECT" && !reason?.trim()) throw new DomainError("A rejection reason is required", 400);
  let materialDemandId: string | null = null;
  if (decision === "APPROVE" && request.kind === "MATERIAL") {
    if (!request.materialItemId) throw new DomainError("Material request is missing its material item", 409);
    const demand = await db.materialDemand.create({ data: { materialItemId: request.materialItemId, wbsNodeId: request.wbsNodeId, quantityNeeded: request.quantity, neededByDate: request.neededByDate, requestedForContractId: request.contractId } });
    materialDemandId = demand.id;
  }
  const updated = await db.resourceRequest.update({ where: { id: requestId }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", reviewedById: user.id, reviewedAt: new Date(), decisionReason: reason ?? null, materialDemandId } });
  await createNotification({ userId: request.requestedById, projectId: request.projectId, type: "RESOURCE_REQUEST_REVIEWED", entityType: "ResourceRequest", entityId: request.id, message: `Your resource request was ${decision === "APPROVE" ? "approved" : "rejected"}` });
  return updated;
}

export async function cancelResourceRequest(user: SessionUser, requestId: string) {
  const request = await db.resourceRequest.findUnique({ where: { id: requestId }, select: { projectId: true, requestedById: true, status: true } });
  if (!request) throw new DomainError("Resource request not found", 404);
  await assertProjectAccess(user, request.projectId);
  if (request.requestedById !== user.id) throw new DomainError("Only the requester may cancel this request", 403);
  if (request.status !== "PENDING") throw new DomainError("Only pending requests may be cancelled", 400);
  return db.resourceRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
}
