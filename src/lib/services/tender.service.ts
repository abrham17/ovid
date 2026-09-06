import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertCompanyPermission, getActiveCompanyRoles, PermissionError } from "@/lib/permissions";

const headTenderingRoles = new Set(["HEAD_TENDERING"]);

async function assertTenderTransitionAuthority(user: SessionUser, next: "DRAFT" | "SUBMITTED" | "WON" | "LOST" | "CANCELLED") {
  const roles = await getActiveCompanyRoles(user.id, user.organizationId);
  if (next !== "DRAFT" && !roles.some((role) => headTenderingRoles.has(role))) {
    throw new PermissionError("Only Head Tendering may submit, cancel, or record a tender result");
  }
}

const tenderTransitions: Record<string, string[]> = {
  DRAFT: ["DRAFT", "SUBMITTED", "CANCELLED"],
  SUBMITTED: ["SUBMITTED", "WON", "LOST", "CANCELLED"],
  WON: ["WON"],
  LOST: ["LOST"],
  CANCELLED: ["CANCELLED"],
};

export async function listTenders(user: SessionUser) {
  await assertCompanyPermission(user, "tendering", "read");
  return db.bidTender.findMany({ where: { ownerOrgId: user.organizationId }, include: { project: { select: { id: true, name: true, code: true } }, submittedBy: { select: { fullName: true } } }, orderBy: { updatedAt: "desc" } });
}

export async function createTender(user: SessionUser, input: { bidNo: string; title: string; description?: string; amount?: number }) {
  await assertCompanyPermission(user, "tendering", "create");
  return db.bidTender.create({ data: { bidNo: input.bidNo, title: input.title, description: input.description, amount: input.amount == null ? undefined : new Prisma.Decimal(input.amount), ownerOrgId: user.organizationId, tenderOwnerId: user.id } });
}

export async function updateTender(user: SessionUser, tenderId: string, input: { title?: string; description?: string; amount?: number; supplierOrgId?: string | null; result?: "DRAFT" | "SUBMITTED" | "WON" | "LOST" | "CANCELLED" }) {
  await assertCompanyPermission(user, "tendering", "update");
  const tender = await db.bidTender.findFirst({ where: { id: tenderId, ownerOrgId: user.organizationId } });
  if (!tender) throw new Error("Tender not found");
  if (tender.projectId) throw new Error("Converted tenders cannot be changed");
  if (input.result) {
    await assertTenderTransitionAuthority(user, input.result);
    if (!tenderTransitions[tender.result].includes(input.result)) throw new PermissionError(`Tender cannot move from ${tender.result} to ${input.result}`);
  }
  if (input.result === "WON" && !input.supplierOrgId && !tender.supplierOrgId) throw new PermissionError("A winning tender must record the awarding client organization");
  if (input.supplierOrgId) {
    const counterparty = await db.organization.findUnique({ where: { id: input.supplierOrgId }, select: { id: true } });
    if (!counterparty) throw new PermissionError("Awarding organization not found");
  }
  const updated = await db.bidTender.update({ where: { id: tender.id }, data: { title: input.title, description: input.description, amount: input.amount == null ? undefined : new Prisma.Decimal(input.amount), supplierOrgId: input.supplierOrgId, result: input.result, submittedAt: input.result === "SUBMITTED" ? new Date() : undefined, awardedAt: input.result === "WON" ? new Date() : undefined, submittedByUserId: input.result === "SUBMITTED" ? user.id : undefined } });
  await db.auditLog.create({ data: { entityType: "BidTender", entityId: tender.id, action: "UPDATE", userId: user.id, diff: { oldResult: tender.result, newResult: updated.result, supplierOrgId: updated.supplierOrgId } } });
  return updated;
}

export async function proposeProjectConversion(user: SessionUser, tenderId: string, proposal: { code: string; name: string; projectType: any; contractType: any; contractValue: number; plannedStartDate: string; plannedEndDate: string; clientOrgId: string; consultantOrgId?: string | null }) {
  await assertCompanyPermission(user, "project_approval", "create");
  const tender = await db.bidTender.findFirst({ where: { id: tenderId, ownerOrgId: user.organizationId, result: "WON", projectId: null } });
  if (!tender) throw new Error("Only won, unconverted organization tenders can be proposed");
  const pending = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: "PROJECT_CREATION", entityType: "BidTender", entityId: tenderId, status: "PENDING" } });
  if (pending) throw new PermissionError("A project conversion request is already pending for this tender");
  return db.$transaction(async (tx) => {
    const approval = await tx.companyApproval.create({ data: { organizationId: user.organizationId, type: "PROJECT_CREATION", entityType: "BidTender", entityId: tenderId, requestedById: user.id, amount: new Prisma.Decimal(proposal.contractValue), thresholdSnapshot: proposal as any } });
    await tx.bidTender.update({ where: { id: tender.id }, data: { conversionProposedAt: new Date() } });
    await tx.auditLog.create({ data: { entityType: "BidTender", entityId: tender.id, action: "CREATE", userId: user.id, diff: { companyApprovalId: approval.id, action: "PROJECT_CONVERSION_PROPOSED" } } });
    return approval;
  });
}

export async function reviewProjectConversion(user: SessionUser, approvalId: string, approved: boolean, comment?: string) {
  await assertCompanyPermission(user, "project_approval", "approve");
  const approval = await db.companyApproval.findFirst({ where: { id: approvalId, organizationId: user.organizationId, type: "PROJECT_CREATION", status: "PENDING" } });
  if (!approval) throw new Error("Pending project conversion not found");
  if (approval.requestedById === user.id) throw new PermissionError("Project conversion requester cannot approve their own request");
  if (!approved) return db.companyApproval.update({ where: { id: approvalId }, data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(), comment } });
  const data = approval.thresholdSnapshot as any;
  return db.$transaction(async (tx) => {
    const tender = await tx.bidTender.findUniqueOrThrow({ where: { id: approval.entityId } });
    if (tender.projectId) throw new PermissionError("Tender has already been converted");
    const project = await tx.project.create({ data: { code: data.code, name: data.name, projectType: data.projectType, contractType: data.contractType, contractValue: new Prisma.Decimal(data.contractValue), plannedStartDate: new Date(data.plannedStartDate), plannedEndDate: new Date(data.plannedEndDate), contractorOrgId: user.organizationId, clientOrgId: data.clientOrgId, consultantOrgId: data.consultantOrgId ?? null } });
    await tx.wbsNode.create({ data: { projectId: project.id, name: "Project Root", code: "0", nodeType: "PHASE" } });
    await tx.bidTender.update({ where: { id: tender.id }, data: { projectId: project.id, convertedAt: new Date() } });
    await tx.companyApproval.update({ where: { id: approval.id }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(), comment } });
    await tx.auditLog.create({ data: { entityType: "Project", entityId: project.id, action: "APPROVE", userId: user.id, diff: { sourceTenderId: tender.id, approvalId: approval.id } } });
    return project;
  });
}
