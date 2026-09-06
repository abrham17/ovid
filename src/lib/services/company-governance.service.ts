import { Prisma } from "@/generated/prisma/client";
import type { AuditFindingStatus, DesignReviewStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCompanyPermission, canCompany, PermissionError } from "@/lib/permissions";

const orgProjectWhere = (organizationId: string) => ({
  OR: [
    { contractorOrgId: organizationId },
    { clientOrgId: organizationId },
    { consultantOrgId: organizationId },
  ],
});

async function requireOrganizationProject(organizationId: string, projectId: string) {
  const project = await db.project.findFirst({ where: { id: projectId, ...orgProjectWhere(organizationId) } });
  if (!project) throw new PermissionError("Project does not belong to this organization portfolio");
  return project;
}

export async function listDesignReviews(user: SessionUser) {
  await assertCompanyPermission(user, "engineering_standards", "read");
  return db.designReview.findMany({
    where: { organizationId: user.organizationId },
    include: { project: { select: { code: true, name: true } }, wbsNode: { select: { code: true, name: true } }, submittedBy: { select: { fullName: true } }, reviewedBy: { select: { fullName: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function submitDesignReview(user: SessionUser, input: { projectId: string; wbsNodeId?: string; title: string; documentRef: string; reviewType: string; safetyCritical: boolean }) {
  const companySubmitter = await canCompany(user, "engineering_standards", "create");
  if (!companySubmitter && !["OFFICE_ENGINEER", "SITE_ENGINEER"].includes(user.role)) throw new PermissionError("You cannot submit a company design review");
  await requireOrganizationProject(user.organizationId, input.projectId);
  if (input.wbsNodeId) {
    const node = await db.wbsNode.findFirst({ where: { id: input.wbsNodeId, projectId: input.projectId } });
    if (!node) throw new PermissionError("WBS node does not belong to this project");
  }
  return db.$transaction(async (tx) => {
    const review = await tx.designReview.create({ data: { ...input, organizationId: user.organizationId, status: "SUBMITTED", submittedById: user.id, submittedAt: new Date() } });
    await tx.auditLog.create({ data: { entityType: "DesignReview", entityId: review.id, action: "CREATE", userId: user.id, diff: { projectId: input.projectId, documentRef: input.documentRef, safetyCritical: input.safetyCritical } } });
    return review;
  });
}

export async function reviewDesignSubmission(user: SessionUser, reviewId: string, input: { decision: "APPROVED" | "CHANGES_REQUIRED" | "CLOSED"; findings?: unknown; resolution?: string }) {
  await assertCompanyPermission(user, "engineering_standards", "approve");
  const review = await db.designReview.findFirst({ where: { id: reviewId, organizationId: user.organizationId } });
  if (!review) throw new PermissionError("Design review not found");
  if (review.submittedById === user.id) throw new PermissionError("Design submitter cannot approve their own review");
  if (!(["SUBMITTED", "CHANGES_REQUIRED", "APPROVED"] as DesignReviewStatus[]).includes(review.status)) throw new PermissionError(`Design review cannot be changed from ${review.status}`);
  return db.$transaction(async (tx) => {
    const updated = await tx.designReview.update({ where: { id: review.id }, data: { status: input.decision, findings: input.findings as Prisma.InputJsonValue | undefined, resolution: input.resolution, reviewedById: user.id, reviewedAt: new Date() } });
    if (input.decision === "APPROVED" && review.wbsNodeId) await tx.wbsNode.update({ where: { id: review.wbsNodeId }, data: { designReady: true } });
    await tx.auditLog.create({ data: { entityType: "DesignReview", entityId: review.id, action: input.decision === "APPROVED" ? "APPROVE" : "UPDATE", userId: user.id, diff: { oldStatus: review.status, newStatus: input.decision, resolution: input.resolution ?? null } } });
    return updated;
  });
}

export async function allocateEquipment(user: SessionUser, input: { equipmentId: string; projectId: string; allocatedFrom: string; allocatedTo: string; purpose: string }) {
  await assertCompanyPermission(user, "equipment_capital", "update");
  const allocatedFrom = new Date(input.allocatedFrom);
  const allocatedTo = new Date(input.allocatedTo);
  if (allocatedTo < allocatedFrom) throw new PermissionError("Allocation end date must be on or after its start date");
  await requireOrganizationProject(user.organizationId, input.projectId);
  const equipment = await db.equipment.findFirst({ where: { id: input.equipmentId, organizationId: user.organizationId, active: true } });
  if (!equipment) throw new PermissionError("Active equipment not found in this organization fleet");
  const conflict = await db.equipmentAllocation.findFirst({ where: { equipmentId: equipment.id, releasedAt: null, allocatedFrom: { lte: allocatedTo }, allocatedTo: { gte: allocatedFrom } } });
  if (conflict) throw new PermissionError("Equipment is already allocated during this date range");
  return db.$transaction(async (tx) => {
    const allocation = await tx.equipmentAllocation.create({ data: { equipmentId: equipment.id, projectId: input.projectId, allocatedFrom, allocatedTo, purpose: input.purpose, allocatedById: user.id } });
    await tx.auditLog.create({ data: { entityType: "EquipmentAllocation", entityId: allocation.id, action: "CREATE", userId: user.id, diff: { equipmentId: equipment.id, projectId: input.projectId, allocatedFrom: input.allocatedFrom, allocatedTo: input.allocatedTo } } });
    return allocation;
  });
}

export async function releaseEquipment(user: SessionUser, allocationId: string) {
  await assertCompanyPermission(user, "equipment_capital", "update");
  const allocation = await db.equipmentAllocation.findFirst({ where: { id: allocationId, equipment: { organizationId: user.organizationId }, releasedAt: null } });
  if (!allocation) throw new PermissionError("Active equipment allocation not found");
  return db.equipmentAllocation.update({ where: { id: allocation.id }, data: { releasedAt: new Date() } });
}

export async function listLegalEscalations(user: SessionUser) {
  await assertCompanyPermission(user, "legal_escalation", "read");
  return db.disputeRecord.findMany({ where: { project: orgProjectWhere(user.organizationId), OR: [{ escalationTo: { not: null } }, { status: "UNDER_REVIEW" }] }, include: { project: { select: { code: true, name: true } }, disputedBy: { select: { fullName: true } }, resolvedBy: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" } });
}

export async function reviewLegalEscalation(user: SessionUser, disputeId: string, input: { status: "UNDER_REVIEW" | "RESOLVED"; resolution: string }) {
  await assertCompanyPermission(user, "legal_escalation", "approve");
  const dispute = await db.disputeRecord.findFirst({ where: { id: disputeId, project: orgProjectWhere(user.organizationId) } });
  if (!dispute) throw new PermissionError("Escalated dispute not found in this organization portfolio");
  return db.$transaction(async (tx) => {
    const updated = await tx.disputeRecord.update({ where: { id: dispute.id }, data: { status: input.status, resolution: input.resolution, escalationTo: "LEGAL_SERVICE_MANAGER", resolvedById: input.status === "RESOLVED" ? user.id : null, resolvedAt: input.status === "RESOLVED" ? new Date() : null } });
    await tx.auditLog.create({ data: { entityType: "DisputeRecord", entityId: dispute.id, action: input.status === "RESOLVED" ? "APPROVE" : "UPDATE", userId: user.id, diff: { oldStatus: dispute.status, newStatus: input.status, resolution: input.resolution } } });
    return updated;
  });
}

export async function listAuditFindings(user: SessionUser) {
  if (!(await canCompany(user, "audit_compliance", "read")) && !(await canCompany(user, "audit_findings", "read"))) throw new PermissionError("Company role cannot read audit findings");
  return db.auditFinding.findMany({ where: { organizationId: user.organizationId }, include: { project: { select: { code: true, name: true } }, raisedBy: { select: { fullName: true } }, owner: { select: { fullName: true } }, verifiedBy: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" } });
}

export async function createAuditFinding(user: SessionUser, input: { projectId?: string; title: string; description: string; severity: string; evidenceRef?: string; remediationPlan?: string; dueAt?: string; ownerId?: string }) {
  await assertCompanyPermission(user, "audit_findings", "create");
  if (input.projectId) await requireOrganizationProject(user.organizationId, input.projectId);
  if (input.ownerId) {
    const owner = await db.user.findFirst({ where: { id: input.ownerId, organizationId: user.organizationId, active: true } });
    if (!owner) throw new PermissionError("Finding owner is not an active organization user");
  }
  return db.auditFinding.create({ data: { organizationId: user.organizationId, projectId: input.projectId, title: input.title, description: input.description, severity: input.severity, evidenceRef: input.evidenceRef, remediationPlan: input.remediationPlan, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, ownerId: input.ownerId, raisedById: user.id } });
}

export async function updateAuditFinding(user: SessionUser, findingId: string, input: { status: AuditFindingStatus; remediationPlan?: string; managementReply?: string }) {
  await assertCompanyPermission(user, "audit_findings", "update");
  const finding = await db.auditFinding.findFirst({ where: { id: findingId, organizationId: user.organizationId } });
  if (!finding) throw new PermissionError("Audit finding not found");
  const verification = input.status === "CLOSED" ? { verifiedById: user.id, verifiedAt: new Date() } : {};
  return db.$transaction(async (tx) => {
    const updated = await tx.auditFinding.update({ where: { id: finding.id }, data: { status: input.status, remediationPlan: input.remediationPlan, managementReply: input.managementReply, ...verification } });
    await tx.auditLog.create({ data: { entityType: "AuditFinding", entityId: finding.id, action: input.status === "CLOSED" ? "APPROVE" : "UPDATE", userId: user.id, diff: { oldStatus: finding.status, newStatus: input.status } } });
    return updated;
  });
}
