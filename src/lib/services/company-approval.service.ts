import { Prisma } from "@/generated/prisma/client";
import type { CompanyApprovalType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertCompanyPermission, canCompany, companyRoleCan, getActiveCompanyRoles, PermissionError, type CompanyResource } from "@/lib/permissions";

const permissionFor: Record<CompanyApprovalType, CompanyResource> = {
  PROJECT_CREATION: "project_approval",
  CONTRACTOR_ONBOARDING: "contractor_onboarding",
  CONTRACT_TEMPLATE: "legal_escalation",
  HIGH_VALUE_CONTRACT: "legal_escalation",
  HIGH_VALUE_VARIATION: "legal_escalation",
  DESIGN_STANDARD: "engineering_standards",
  EQUIPMENT_CAPITAL: "equipment_capital",
  IPC_PAYMENT: "finance_approval",
  EXECUTIVE_CONTRACT: "executive_approval",
  EXECUTIVE_VARIATION: "executive_approval",
};

export async function listCompanyApprovals(user: SessionUser) {
  if (user.role === "ADMIN") throw new PermissionError("Technical administrators cannot access business approval queues");
  const roles = await getActiveCompanyRoles(user.id, user.organizationId);
  const allowedTypes = (Object.keys(permissionFor) as CompanyApprovalType[]).filter((type) => roles.some((role) => companyRoleCan(role, permissionFor[type], "read") || companyRoleCan(role, permissionFor[type], "approve") || companyRoleCan(role, permissionFor[type], "create")));
  return db.companyApproval.findMany({ where: { organizationId: user.organizationId, OR: [{ type: { in: allowedTypes } }, { requestedById: user.id }] }, include: { requestedBy: { select: { fullName: true } }, reviewedBy: { select: { fullName: true } } }, orderBy: { requestedAt: "desc" }, take: 200 });
}

export async function requestCompanyApproval(user: SessionUser, input: { type: CompanyApprovalType; entityType: string; entityId: string; amount?: number; comment?: string; thresholdSnapshot?: unknown }) {
  const projectRequester = (input.type === "IPC_PAYMENT" && user.role === "FINANCE") || (["HIGH_VALUE_CONTRACT", "HIGH_VALUE_VARIATION", "CONTRACT_TEMPLATE"].includes(input.type) && user.role === "CONTRACTS_LEGAL") || (input.type === "DESIGN_STANDARD" && ["SITE_ENGINEER", "OFFICE_ENGINEER"].includes(user.role));
  if (!projectRequester && !(await canCompany(user, permissionFor[input.type], "create"))) throw new PermissionError("You cannot request this company approval");
  const existing = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, status: "PENDING" } });
  if (existing) return existing;
  return db.companyApproval.create({ data: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, requestedById: user.id, amount: input.amount == null ? undefined : new Prisma.Decimal(input.amount), comment: input.comment, thresholdSnapshot: input.thresholdSnapshot as Prisma.InputJsonValue | undefined } });
}

export async function ensureCompanyApprovalRequest(user: SessionUser, input: { type: CompanyApprovalType; entityType: string; entityId: string; amount?: number; comment: string; thresholdSnapshot?: unknown }) {
  const approved = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, status: "APPROVED" } });
  if (approved) return { approved, pending: null };
  const pending = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, status: "PENDING" } }) ?? await db.companyApproval.create({ data: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, requestedById: user.id, amount: input.amount == null ? undefined : new Prisma.Decimal(input.amount), comment: input.comment, thresholdSnapshot: input.thresholdSnapshot as Prisma.InputJsonValue | undefined } });
  return { approved: null, pending };
}

export async function ensureExecutiveCountersignature(user: SessionUser, input: { type: "EXECUTIVE_CONTRACT" | "EXECUTIVE_VARIATION"; entityType: string; entityId: string; amount: number; comment: string; thresholdSnapshot?: unknown }) {
  const approved = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, status: "APPROVED" } });
  if (approved) return { approved, pending: null };
  const specialistType = input.type === "EXECUTIVE_CONTRACT" ? "HIGH_VALUE_CONTRACT" : "HIGH_VALUE_VARIATION";
  const specialistApproval = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: specialistType, entityType: input.entityType, entityId: input.entityId, status: "APPROVED" } });
  if (!specialistApproval) throw new PermissionError("Specialist company approval is required before General Manager countersignature");
  const pending = await db.companyApproval.findFirst({ where: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, status: "PENDING" } }) ?? await db.companyApproval.create({ data: { organizationId: user.organizationId, type: input.type, entityType: input.entityType, entityId: input.entityId, requestedById: specialistApproval.reviewedById ?? specialistApproval.requestedById, amount: new Prisma.Decimal(input.amount), comment: input.comment, thresholdSnapshot: input.thresholdSnapshot as Prisma.InputJsonValue | undefined } });
  return { approved: null, pending };
}

async function assertApprovalEntityScope(approval: { type: CompanyApprovalType; entityType: string; entityId: string; organizationId: string; thresholdSnapshot: unknown }) {
  if (approval.type === "IPC_PAYMENT" && approval.entityType === "MeasurementEntry") {
    const entity = await db.measurementEntry.findFirst({ where: { id: approval.entityId, wbsNode: { project: { OR: [{ contractorOrgId: approval.organizationId }, { clientOrgId: approval.organizationId }, { consultantOrgId: approval.organizationId }] } } } });
    if (!entity) throw new PermissionError("IPC does not belong to this organization");
  } else if ((approval.type === "HIGH_VALUE_VARIATION" || approval.type === "EXECUTIVE_VARIATION") && approval.entityType === "VariationOrder") {
    const entity = await db.variationOrder.findFirst({ where: { id: approval.entityId, project: { OR: [{ contractorOrgId: approval.organizationId }, { clientOrgId: approval.organizationId }, { consultantOrgId: approval.organizationId }] } } });
    if (!entity) throw new PermissionError("Variation does not belong to this organization");
  } else if ((approval.type === "HIGH_VALUE_CONTRACT" || approval.type === "EXECUTIVE_CONTRACT") && approval.entityType === "ContractProposal") {
    const input = approval.thresholdSnapshot as any;
    const project = await db.project.findFirst({ where: { id: input?.projectId, OR: [{ contractorOrgId: approval.organizationId }, { clientOrgId: approval.organizationId }, { consultantOrgId: approval.organizationId }] } });
    if (!project) throw new PermissionError("Contract proposal does not belong to this organization");
  } else if (approval.type === "EQUIPMENT_CAPITAL" && approval.entityType === "Equipment") {
    const input = approval.thresholdSnapshot as any;
    if (input?.action === "DISPOSE") {
      const entity = await db.equipment.findFirst({ where: { id: input.equipmentId, organizationId: approval.organizationId } });
      if (!entity) throw new PermissionError("Equipment does not belong to this organization");
    }
  }
}

export async function reviewCompanyApproval(user: SessionUser, approvalId: string, approved: boolean, comment?: string) {
  const approval = await db.companyApproval.findFirst({ where: { id: approvalId, organizationId: user.organizationId, status: "PENDING" } });
  if (!approval) throw new Error("Pending approval not found");
  await assertCompanyPermission(user, permissionFor[approval.type], "approve");
  if (approval.requestedById === user.id) throw new PermissionError("Approval requester cannot approve their own request");
  await assertApprovalEntityScope(approval);
  return db.$transaction(async (tx) => {
    const result = await tx.companyApproval.update({ where: { id: approval.id }, data: { status: approved ? "APPROVED" : "REJECTED", reviewedById: user.id, reviewedAt: new Date(), comment } });
    if (approved) {
      if (approval.type === "IPC_PAYMENT" && approval.entityType === "MeasurementEntry") {
        await tx.measurementEntry.update({ where: { id: approval.entityId }, data: { status: "PAID" } });
      } else if ((approval.type === "CONTRACT_TEMPLATE" || approval.type === "DESIGN_STANDARD") && approval.entityType === "DocumentTemplate") {
        // The approval and audit row are the authoritative template gate.
      } else if (approval.type === "EQUIPMENT_CAPITAL" && approval.entityType === "Equipment") {
        const input = approval.thresholdSnapshot as any;
        if (input?.action === "ACQUIRE") await tx.equipment.create({ data: { organizationId: user.organizationId, equipmentType: input.equipmentType, plateNo: input.plateNo ?? null, serialNo: input.serialNo ?? null } });
        if (input?.action === "DISPOSE" && input.equipmentId) await tx.equipment.update({ where: { id: input.equipmentId }, data: { active: false } });
      }
      if (approval.type === "HIGH_VALUE_CONTRACT" && Number(approval.amount ?? 0) >= Number(process.env.GM_CONTRACT_COUNTERSIGN_THRESHOLD_ETB ?? 100000000)) {
        const exists = await tx.companyApproval.findFirst({ where: { organizationId: approval.organizationId, type: "EXECUTIVE_CONTRACT", entityType: approval.entityType, entityId: approval.entityId, status: "PENDING" } });
        if (!exists) await tx.companyApproval.create({ data: { organizationId: approval.organizationId, type: "EXECUTIVE_CONTRACT", entityType: approval.entityType, entityId: approval.entityId, requestedById: user.id, amount: approval.amount, comment: "General Manager countersignature required after legal approval", thresholdSnapshot: approval.thresholdSnapshot ?? undefined } });
      }
      if (approval.type === "HIGH_VALUE_VARIATION" && Number(approval.amount ?? 0) >= Number(process.env.GM_VARIATION_COUNTERSIGN_THRESHOLD_ETB ?? 25000000)) {
        const exists = await tx.companyApproval.findFirst({ where: { organizationId: approval.organizationId, type: "EXECUTIVE_VARIATION", entityType: approval.entityType, entityId: approval.entityId, status: "PENDING" } });
        if (!exists) await tx.companyApproval.create({ data: { organizationId: approval.organizationId, type: "EXECUTIVE_VARIATION", entityType: approval.entityType, entityId: approval.entityId, requestedById: user.id, amount: approval.amount, comment: "General Manager countersignature required after legal approval", thresholdSnapshot: approval.thresholdSnapshot ?? undefined } });
      }
    }
    await tx.auditLog.create({ data: { entityType: approval.entityType, entityId: approval.entityId, action: approved ? "APPROVE" : "REJECT", userId: user.id, diff: { companyApprovalId: approval.id, type: approval.type, comment: comment ?? null } } });
    return result;
  });
}
