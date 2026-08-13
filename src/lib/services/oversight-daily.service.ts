import { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/domain-rules";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { assertScopeVisible, getEffectiveScope } from "@/lib/scope";
import { createNotification } from "@/lib/services/notification.service";
import type { CreateOversightEntryInput } from "@/lib/validations/workflows";

const PM_ROLES = new Set(["SENIOR_PM", "DEPUTY_PM", "ADMIN"]);

export async function listOversightDailyEntries(user: SessionUser, projectId: string, contractId?: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "daily_report", "read");
  const scope = await getEffectiveScope(user, projectId);
  return db.oversightDailyEntry.findMany({
    where: {
      projectId,
      ...(contractId ? { contractId } : {}),
      ...(user.partyType === "SUBCONTRACTOR"
        ? { contract: { contractorOrgId: user.organizationId } }
        : !PM_ROLES.has(user.role) && scope.oversightContractIds.size > 0
          ? { contractId: { in: [...scope.oversightContractIds] } }
          : {}),
    },
    include: {
      createdBy: { select: { id: true, fullName: true, role: true } },
      contract: { select: { id: true, scopeDescription: true, contractorOrg: { select: { name: true } } } },
      wbsNode: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export async function createOversightDailyEntry(user: SessionUser, projectId: string, input: CreateOversightEntryInput) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "daily_report", "create");
  const assignment = await db.oversightAssignment.findFirst({
    where: { id: input.oversightAssignmentId, projectId, contractId: input.contractId, userId: user.id, endedAt: null },
    select: { id: true },
  });
  if (!assignment) throw new DomainError("You do not hold active oversight over this contract", 403);
  const scope = await getEffectiveScope(user, projectId);
  assertScopeVisible(scope, input.wbsNodeId);
  return db.oversightDailyEntry.create({
    data: {
      projectId,
      contractId: input.contractId,
      wbsNodeId: input.wbsNodeId,
      oversightAssignmentId: assignment.id,
      date: new Date(input.date),
      activityDescription: input.activityDescription,
      observedQuantity: input.observedQuantity == null ? null : new Prisma.Decimal(input.observedQuantity),
      observedUnit: input.observedUnit ?? null,
      reportedQuantity: input.reportedQuantity == null ? null : new Prisma.Decimal(input.reportedQuantity),
      quantityAssessment: input.quantityAssessment ?? "NOT_ASSESSED",
      qualityAssessment: input.qualityAssessment ?? null,
      concernsRaised: input.concernsRaised ?? null,
      manpowerObserved: input.manpowerObserved ?? null,
      createdById: user.id,
    },
  });
}

export async function submitOversightDailyEntry(user: SessionUser, entryId: string) {
  const entry = await db.oversightDailyEntry.findUnique({
    where: { id: entryId },
    select: { id: true, projectId: true, createdById: true, status: true, quantityAssessment: true },
  });
  if (!entry) throw new DomainError("Oversight daily entry not found", 404);
  await assertProjectAccess(user, entry.projectId);
  if (entry.createdById !== user.id) throw new DomainError("Only the author may submit this entry", 403);
  if (entry.status !== "DRAFT") throw new DomainError("Only draft entries may be submitted", 400);
  const updated = await db.oversightDailyEntry.update({ where: { id: entryId }, data: { status: "SUBMITTED" } });
  if (entry.quantityAssessment === "BELOW_REPORTED") {
    const managers = await db.user.findMany({
      where: { role: { in: ["SENIOR_PM", "DEPUTY_PM"] }, active: true, memberships: { some: { projectId: entry.projectId } } },
      select: { id: true },
    });
    for (const manager of managers) {
      await createNotification({
        userId: manager.id,
        projectId: entry.projectId,
        type: "OVERSIGHT_VARIANCE_FLAGGED",
        entityType: "OversightDailyEntry",
        entityId: entry.id,
        message: "Oversight measured progress below the subcontractor-reported quantity",
      });
    }
  }
  return updated;
}

export async function approveOversightDailyEntry(user: SessionUser, entryId: string) {
  const entry = await db.oversightDailyEntry.findUnique({ where: { id: entryId }, select: { projectId: true, status: true } });
  if (!entry) throw new DomainError("Oversight daily entry not found", 404);
  await assertProjectAccess(user, entry.projectId);
  assertPermission(user, "daily_report", "approve");
  if (!PM_ROLES.has(user.role)) throw new DomainError("Only the Contractor PM tier may approve oversight reports", 403);
  if (entry.status !== "SUBMITTED") throw new DomainError("Only submitted entries may be approved", 400);
  return db.oversightDailyEntry.update({ where: { id: entryId }, data: { status: "APPROVED" } });
}
