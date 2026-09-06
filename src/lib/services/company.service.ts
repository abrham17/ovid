import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertCompanyPermission, PermissionError } from "@/lib/permissions";
import type { CompanyAssignmentInput, CompanyStaffInviteInput } from "@/lib/validations/company";
import { calculateCriticalActivityIds, ratio } from "@/lib/company-portfolio";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function listCompanyStaff(user: SessionUser) {
  await assertCompanyPermission(user, "company_staff", "read");
  return db.companyStaffAssignment.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ active: "desc" }, { assignedAt: "desc" }],
    include: { user: { select: { id: true, fullName: true, email: true, jobTitle: true, role: true, active: true } }, assignedBy: { select: { fullName: true } } },
  });
}

export async function assignCompanyRole(user: SessionUser, input: CompanyAssignmentInput) {
  await assertCompanyPermission(user, "company_staff", "create");
  if (input.userId === user.id) throw new PermissionError("You cannot assign a company role to yourself");
  const target = await db.user.findFirst({ where: { id: input.userId, organizationId: user.organizationId } });
  if (!target) throw new PermissionError("User is not in your organization");
  const existing = await db.companyStaffAssignment.findFirst({ where: { userId: target.id, organizationId: user.organizationId, role: input.role, active: true } });
  if (existing) throw new PermissionError("This user already has that active company role");
  return db.$transaction(async (tx) => {
    const assignment = await tx.companyStaffAssignment.create({ data: { userId: target.id, organizationId: user.organizationId, role: input.role, assignedById: user.id, reason: input.reason } });
    await tx.auditLog.create({ data: { entityType: "CompanyStaffAssignment", entityId: assignment.id, action: "CREATE", userId: user.id, diff: { targetUserId: target.id, oldRoles: [], newRoles: [input.role], reason: input.reason ?? null } } });
    return assignment;
  });
}

export async function deactivateCompanyRole(user: SessionUser, assignmentId: string, reason?: string) {
  await assertCompanyPermission(user, "company_staff", "update");
  const assignment = await db.companyStaffAssignment.findFirst({ where: { id: assignmentId, organizationId: user.organizationId } });
  if (!assignment) throw new Error("Assignment not found");
  if (!assignment.active) throw new PermissionError("Assignment is already inactive");
  if (assignment.userId === user.id) throw new PermissionError("You cannot revoke your own company role");
  return db.$transaction(async (tx) => {
    const updated = await tx.companyStaffAssignment.update({ where: { id: assignmentId }, data: { active: false, endedAt: new Date(), reason: reason ?? assignment.reason } });
    await tx.auditLog.create({ data: { entityType: "CompanyStaffAssignment", entityId: assignmentId, action: "UPDATE", userId: user.id, diff: { targetUserId: assignment.userId, oldRoles: [assignment.role], newRoles: [], reason: reason ?? null } } });
    return updated;
  });
}

export async function reactivateCompanyRole(user: SessionUser, assignmentId: string, reason: string) {
  await assertCompanyPermission(user, "company_staff", "update");
  const former = await db.companyStaffAssignment.findFirst({ where: { id: assignmentId, organizationId: user.organizationId, active: false } });
  if (!former) throw new Error("Inactive assignment not found");
  if (former.userId === user.id) throw new PermissionError("You cannot reactivate a company role for yourself");
  const target = await db.user.findFirst({ where: { id: former.userId, organizationId: user.organizationId, active: true } });
  if (!target) throw new PermissionError("The former role holder is not an active organization user");
  const duplicate = await db.companyStaffAssignment.findFirst({ where: { userId: former.userId, organizationId: user.organizationId, role: former.role, active: true } });
  if (duplicate) throw new PermissionError("This company role is already active for the user");
  return db.$transaction(async (tx) => {
    const next = await tx.companyStaffAssignment.create({ data: { userId: former.userId, organizationId: former.organizationId, role: former.role, assignedById: user.id, reason } });
    await tx.auditLog.create({ data: { entityType: "CompanyStaffAssignment", entityId: next.id, action: "CREATE", userId: user.id, diff: { reactivatedFromAssignmentId: former.id, targetUserId: former.userId, oldRoles: [], newRoles: [former.role], reason } } });
    return next;
  });
}

export async function replaceCompanyRole(user: SessionUser, input: { assignmentId: string; replacementUserId: string; reason: string }) {
  await assertCompanyPermission(user, "company_staff", "update");
  if (input.replacementUserId === user.id) throw new PermissionError("You cannot assign a company role to yourself");
  const [former, replacement] = await Promise.all([
    db.companyStaffAssignment.findFirst({ where: { id: input.assignmentId, organizationId: user.organizationId, active: true } }),
    db.user.findFirst({ where: { id: input.replacementUserId, organizationId: user.organizationId, active: true } }),
  ]);
  if (!former) throw new Error("Active assignment not found");
  if (!replacement) throw new PermissionError("Replacement user is not active in your organization");
  const duplicate = await db.companyStaffAssignment.findFirst({ where: { userId: replacement.id, organizationId: user.organizationId, role: former.role, active: true } });
  if (duplicate) throw new PermissionError("Replacement user already holds this role");
  return db.$transaction(async (tx) => {
    const endedAt = new Date();
    await tx.companyStaffAssignment.update({ where: { id: former.id }, data: { active: false, endedAt, reason: input.reason } });
    const next = await tx.companyStaffAssignment.create({ data: { userId: replacement.id, organizationId: user.organizationId, role: former.role, assignedById: user.id, reason: input.reason } });
    await tx.auditLog.create({ data: { entityType: "CompanyStaffAssignment", entityId: next.id, action: "UPDATE", userId: user.id, diff: { replacedAssignmentId: former.id, formerUserId: former.userId, replacementUserId: replacement.id, oldRoles: [former.role], newRoles: [former.role], reason: input.reason } } });
    return next;
  });
}

export async function inviteCompanyStaff(user: SessionUser, input: CompanyStaffInviteInput) {
  await assertCompanyPermission(user, "company_staff", "create");
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing && existing.organizationId !== user.organizationId) throw new PermissionError("Email belongs to another organization");
  if (existing) {
    if (existing.organizationId !== user.organizationId) throw new PermissionError("Email belongs to another organization");
    if (existing.id === user.id) throw new PermissionError("You cannot assign a company role to yourself");
    const active = await db.companyStaffAssignment.findFirst({ where: { userId: existing.id, organizationId: user.organizationId, role: input.role, active: true } });
    if (active) return { status: "already_assigned", user: existing };
    const assignment = await assignCompanyRole(user, { userId: existing.id, role: input.role, reason: "Assigned through company staff administration" });
    return { status: "assigned_existing", user: existing, assignment };
  }
  const pending = await db.companyInvitation.findFirst({ where: { email: input.email, organizationId: user.organizationId, status: "PENDING", expiresAt: { gt: new Date() } } });
  if (pending) return { status: "pending", invitationId: pending.id };
  const token = randomBytes(32).toString("hex");
  const invitation = await db.companyInvitation.create({ data: { email: input.email, fullName: input.fullName, jobTitle: input.jobTitle, role: input.role, organizationId: user.organizationId, invitedById: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  await db.auditLog.create({ data: { entityType: "CompanyInvitation", entityId: invitation.id, action: "CREATE", userId: user.id, diff: { email: invitation.email, role: invitation.role } } });
  return { status: "created", invitationId: invitation.id, token };
}

export async function revokeCompanyInvitation(user: SessionUser, invitationId: string) {
  await assertCompanyPermission(user, "company_staff", "delete");
  const invitation = await db.companyInvitation.findFirst({ where: { id: invitationId, organizationId: user.organizationId, status: "PENDING" } });
  if (!invitation) throw new Error("Pending company invitation not found");
  const updated = await db.companyInvitation.update({ where: { id: invitation.id }, data: { status: "REVOKED" } });
  await db.auditLog.create({ data: { entityType: "CompanyInvitation", entityId: invitation.id, action: "UPDATE", userId: user.id, diff: { oldStatus: "PENDING", newStatus: "REVOKED" } } });
  return updated;
}

export async function resendCompanyInvitation(user: SessionUser, invitationId: string) {
  await assertCompanyPermission(user, "company_staff", "update");
  const invitation = await db.companyInvitation.findFirst({ where: { id: invitationId, organizationId: user.organizationId, status: "PENDING" } });
  if (!invitation) throw new Error("Pending company invitation not found");
  const token = randomBytes(32).toString("hex");
  await db.companyInvitation.update({ where: { id: invitation.id }, data: { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  await db.auditLog.create({ data: { entityType: "CompanyInvitation", entityId: invitation.id, action: "UPDATE", userId: user.id, diff: { resent: true } } });
  return { invitationId: invitation.id, token };
}

export async function listCompanyInvitations(user: SessionUser) {
  await assertCompanyPermission(user, "company_staff", "read");
  return db.companyInvitation.findMany({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" }, include: { invitedBy: { select: { fullName: true } } } });
}

export async function proposeContractorOnboarding(user: SessionUser, input: { projectId: string; contractorOrgId: string; email: string; fullName: string; jobTitle: string; role: any }) {
  await assertCompanyPermission(user, "contractor_onboarding", "create");
  const project = await db.project.findFirst({ where: { id: input.projectId, contractorOrgId: user.organizationId } });
  if (!project) throw new PermissionError("Project is not owned by your organization");
  const targetOrg = await db.organization.findUnique({ where: { id: input.contractorOrgId } });
  if (!targetOrg) throw new Error("Contractor organization not found");
  const approval = await db.companyApproval.create({ data: { organizationId: user.organizationId, type: "CONTRACTOR_ONBOARDING", entityType: "ProjectInvitation", entityId: project.id, requestedById: user.id, thresholdSnapshot: input as any } });
  return approval;
}

export async function reviewContractorOnboarding(user: SessionUser, approvalId: string, approved: boolean, comment?: string) {
  await assertCompanyPermission(user, "contractor_onboarding", "approve");
  const approval = await db.companyApproval.findFirst({ where: { id: approvalId, organizationId: user.organizationId, type: "CONTRACTOR_ONBOARDING", status: "PENDING" } });
  if (!approval) throw new Error("Pending contractor onboarding not found");
  if (approval.requestedById === user.id) throw new PermissionError("Contractor onboarding requester cannot approve their own request");
  if (!approved) return db.companyApproval.update({ where: { id: approval.id }, data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(), comment } });
  const input = approval.thresholdSnapshot as any;
  const token = randomBytes(32).toString("hex");
  const invitation = await db.invitation.create({ data: { email: String(input.email).toLowerCase(), fullName: input.fullName, jobTitle: input.jobTitle, role: input.role, organizationId: input.contractorOrgId, invitedById: user.id, projectId: input.projectId, projectRole: input.role, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 7 * 86400000) } });
  await db.companyApproval.update({ where: { id: approval.id }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(), comment } });
  await db.auditLog.create({ data: { entityType: "Invitation", entityId: invitation.id, action: "APPROVE", userId: user.id, diff: { companyApprovalId: approval.id, projectId: input.projectId, contractorOrgId: input.contractorOrgId } } });
  return { invitation, token };
}

export async function getCompanyDashboard(user: SessionUser) {
  await assertCompanyPermission(user, "portfolio", "read");
  const projects = await db.project.findMany({ where: { OR: [{ contractorOrgId: user.organizationId }, { clientOrgId: user.organizationId }, { consultantOrgId: user.organizationId }] }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, status: true, contractValue: true, plannedStartDate: true, plannedEndDate: true } });
  const ids = projects.map((p) => p.id);
  const [risks, incidents, variations, overdue, audits, reports, approvals, tenders, certifiedIpcs, equipmentHours, activities, contractTotals, paidIpcs, certifiedUnpaid, openDefects, resourceConflicts, costActuals, auditFindings] = await Promise.all([
    db.riskEntry.count({ where: { projectId: { in: ids.length ? ids : ["__none__"] }, status: { in: ["OPEN", "MITIGATING"] } } }),
    db.safetyIncident.count({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: { in: ["OPEN", "ACTION_PENDING"] } } }),
    db.variationOrder.count({ where: { projectId: { in: ids.length ? ids : ["__none__"] }, status: { notIn: ["CONSULTANT_APPROVED", "REJECTED"] } } }),
    db.scheduleActivity.count({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: "NOT_STARTED", plannedFinish: { lt: new Date() } } }),
    db.auditLog.count({ where: { user: { organizationId: user.organizationId } } }),
    db.regulatoryReport.count({ where: { projectId: { in: ids.length ? ids : ["__none__"] } } }),
    db.companyApproval.count({ where: { organizationId: user.organizationId, status: "PENDING" } }),
    db.bidTender.count({ where: { ownerOrgId: user.organizationId, projectId: null } }),
    db.measurementEntry.count({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: "CERTIFIED" } }),
    db.equipmentUsageLog.aggregate({ where: { projectId: { in: ids.length ? ids : ["__none__"] } }, _sum: { operatingHours: true, idleHours: true, downHours: true } }),
    db.scheduleActivity.findMany({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } } }, select: { id: true, progressPercent: true, plannedStart: true, plannedFinish: true, baselineStart: true, baselineFinish: true, wbsNode: { select: { projectId: true } }, successors: { select: { successorId: true, lagDays: true } } } }),
    db.contract.aggregate({ where: { projectId: { in: ids.length ? ids : ["__none__"] }, status: "ACTIVE" }, _sum: { contractValue: true } }),
    db.measurementEntry.findMany({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: "PAID" }, select: { quantity: true, unitRate: true } }),
    db.measurementEntry.findMany({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: "CERTIFIED" }, select: { quantity: true, unitRate: true } }),
    db.defectLog.count({ where: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } }, status: { not: "VERIFIED_CLOSED" } } }),
    db.equipmentAllocation.count({ where: { projectId: { in: ids.length ? ids : ["__none__"] }, releasedAt: null, allocatedTo: { gte: new Date() } } }),
    db.costActual.findMany({ where: { boqItem: { wbsNode: { projectId: { in: ids.length ? ids : ["__none__"] } } } }, select: { amount: true, boqItem: { select: { wbsNode: { select: { projectId: true } } } } } }),
    db.auditFinding.findMany({ where: { organizationId: user.organizationId, status: { not: "CLOSED" } }, select: { dueAt: true } }),
  ]);
  const actualCostByProject = new Map<string, number>();
  for (const actual of costActuals) actualCostByProject.set(actual.boqItem.wbsNode.projectId, (actualCostByProject.get(actual.boqItem.wbsNode.projectId) ?? 0) + Number(actual.amount));
  const criticalIds = calculateCriticalActivityIds(activities.map((activity) => ({ id: activity.id, plannedStart: activity.plannedStart, plannedFinish: activity.plannedFinish, successors: activity.successors })));
  const activityByProject = new Map<string, { count: number; progress: number; baselineVarianceDays: number; criticalActivities: number }>();
  for (const activity of activities) {
    const row = activityByProject.get(activity.wbsNode.projectId) ?? { count: 0, progress: 0, baselineVarianceDays: 0, criticalActivities: 0 };
    row.count += 1; row.progress += Number(activity.progressPercent); row.baselineVarianceDays += Math.round((activity.plannedFinish.getTime() - activity.baselineFinish.getTime()) / 86400000); row.criticalActivities += criticalIds.has(activity.id) ? 1 : 0;
    activityByProject.set(activity.wbsNode.projectId, row);
  }
  const portfolio = projects.map((project) => { const activity = activityByProject.get(project.id); const today = Date.now(); const elapsed = Math.max(0, today - project.plannedStartDate.getTime()); const duration = Math.max(1, project.plannedEndDate.getTime() - project.plannedStartDate.getTime()); const plannedProgress = Math.min(100, Math.round((elapsed / duration) * 100)); const actualProgress = activity?.count ? Math.round(activity.progress / activity.count) : 0; const contractValue = Number(project.contractValue); const plannedValue = contractValue * plannedProgress / 100; const earnedValue = contractValue * actualProgress / 100; const actualCost = actualCostByProject.get(project.id) ?? 0; return { ...project, contractValue, plannedProgress, actualProgress, scheduleVariance: actualProgress - plannedProgress, baselineVarianceDays: activity?.baselineVarianceDays ?? 0, plannedValue, earnedValue, actualCost, spi: ratio(earnedValue, plannedValue), cpi: ratio(earnedValue, actualCost), criticalActivities: activity?.criticalActivities ?? 0 }; });
  const paidValue = paidIpcs.reduce((sum, entry) => sum + Number(entry.quantity) * Number(entry.unitRate), 0);
  const certifiedUnpaidValue = certifiedUnpaid.reduce((sum, entry) => sum + Number(entry.quantity) * Number(entry.unitRate), 0);
  const portfolioPlannedValue = portfolio.reduce((sum, project) => sum + project.plannedValue, 0); const portfolioEarnedValue = portfolio.reduce((sum, project) => sum + project.earnedValue, 0); const actualCostValue = portfolio.reduce((sum, project) => sum + project.actualCost, 0);
  return { projects: portfolio, metrics: { projects: projects.length, activeProjects: projects.filter((p) => p.status === "ACTIVE").length, openRisks: risks, openIncidents: incidents, openDefects, pendingVariations: variations, overdueActivities: overdue, resourceConflicts, auditEvents: audits, regulatoryReports: reports, pendingApprovals: approvals, openTenders: tenders, certifiedIpcs, certifiedUnpaidValue, activeContractValue: Number(contractTotals._sum.contractValue ?? 0), paidIpcValue: paidValue, actualCostValue, portfolioPlannedValue, portfolioEarnedValue, portfolioSpi: ratio(portfolioEarnedValue, portfolioPlannedValue), portfolioCpi: ratio(portfolioEarnedValue, actualCostValue), criticalActivities: criticalIds.size, openAuditFindings: auditFindings.length, overdueAuditFindings: auditFindings.filter((finding) => finding.dueAt && finding.dueAt < new Date()).length, equipmentOperatingHours: Number(equipmentHours._sum.operatingHours ?? 0), equipmentIdleHours: Number(equipmentHours._sum.idleHours ?? 0), equipmentDownHours: Number(equipmentHours._sum.downHours ?? 0) } };
}

export async function acceptCompanyInvitation(token: string, fullName: string, password: string) {
  const invitation = await db.companyInvitation.findFirst({ where: { tokenHash: tokenHash(token), status: "PENDING", expiresAt: { gt: new Date() } } });
  if (!invitation) throw new Error("Company invitation not found or expired");
  const { hashPassword } = await import("@/lib/auth");
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: invitation.email } });
    if (user && user.organizationId !== invitation.organizationId) throw new PermissionError("Email belongs to another organization");
    user = user
      ? await tx.user.update({
          where: { id: user.id },
          data: {
            fullName,
            passwordHash,
            jobTitle: invitation.jobTitle,
            role: "COMPANY_STAFF",
            active: true,
            mustChangePassword: false,
          },
        })
      : await tx.user.create({ data: { organizationId: invitation.organizationId, email: invitation.email, fullName, passwordHash, jobTitle: invitation.jobTitle, role: "COMPANY_STAFF", active: true } });
    const activeAssignment = await tx.companyStaffAssignment.findFirst({ where: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role, active: true } });
    if (!activeAssignment) await tx.companyStaffAssignment.create({ data: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role, assignedById: invitation.invitedById } });
    await tx.companyInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedUserId: user.id } });
    await tx.auditLog.create({ data: { entityType: "CompanyInvitation", entityId: invitation.id, action: "APPROVE", userId: user.id, diff: { role: invitation.role, organizationId: invitation.organizationId } } });
    return user;
  });
}

export async function getCompanyInvitation(token: string) {
  return db.companyInvitation.findFirst({ where: { tokenHash: tokenHash(token), status: "PENDING", expiresAt: { gt: new Date() } }, select: { email: true, fullName: true, jobTitle: true, role: true, expiresAt: true, organization: { select: { name: true, partyType: true } } } });
}
