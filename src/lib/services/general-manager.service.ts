import type {
  ExecutiveInterventionCategory,
  ExecutiveInterventionPriority,
  ExecutiveInterventionStatus,
} from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyDashboard } from "@/lib/services/company.service";
import { assertCompanyPermission, hasCompanyRole, PermissionError } from "@/lib/permissions";
import {
  canCloseExecutiveIntervention,
  canManagementTransitionIntervention,
  isTerminalExecutiveIntervention,
  type ManagementInterventionStatus,
} from "@/lib/executive-intervention";

const gmApprovalTypes = [
  "PROJECT_CREATION",
  "CONTRACTOR_ONBOARDING",
  "EQUIPMENT_CAPITAL",
  "EXECUTIVE_CONTRACT",
  "EXECUTIVE_VARIATION",
] as const;

const openInterventionStatuses: ExecutiveInterventionStatus[] = ["OPEN", "ACKNOWLEDGED", "ACTION_IN_PROGRESS", "READY_FOR_REVIEW"];

const orgProjectWhere = (organizationId: string) => ({
  OR: [
    { contractorOrgId: organizationId },
    { clientOrgId: organizationId },
    { consultantOrgId: organizationId },
  ],
});

async function assertGeneralManager(user: SessionUser) {
  if (!(await hasCompanyRole(user, "GENERAL_MANAGER"))) throw new PermissionError("An active General Manager assignment is required");
}

export async function getGeneralManagerDashboard(user: SessionUser) {
  await assertGeneralManager(user);
  const portfolio = await getCompanyDashboard(user);
  const projectIds = portfolio.projects.map((project) => project.id);
  const scopedProjectIds = projectIds.length ? projectIds : ["__none__"];
  const now = new Date();
  const reportCutoff = new Date(now.getTime() - 30 * 86_400_000);

  const [approvals, interventions, safetyIncidents, auditFindings, recentReports, decisionHistory, managers, stoppages] = await Promise.all([
    db.companyApproval.findMany({
      where: { organizationId: user.organizationId, type: { in: [...gmApprovalTypes] }, status: "PENDING" },
      include: { requestedBy: { select: { id: true, fullName: true, jobTitle: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    db.executiveIntervention.findMany({
      where: { organizationId: user.organizationId },
      include: {
        project: { select: { id: true, code: true, name: true } },
        accountableUser: { select: { id: true, fullName: true, jobTitle: true } },
        createdBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
        events: { include: { author: { select: { fullName: true, jobTitle: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
    }),
    db.safetyIncident.findMany({
      where: { wbsNode: { projectId: { in: scopedProjectIds } }, status: { in: ["OPEN", "ACTION_PENDING"] } },
      include: { wbsNode: { select: { project: { select: { id: true, code: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.auditFinding.findMany({
      where: { organizationId: user.organizationId, status: { not: "CLOSED" } },
      include: { project: { select: { id: true, code: true, name: true } }, owner: { select: { fullName: true, jobTitle: true } }, raisedBy: { select: { fullName: true } } },
      orderBy: [{ severity: "desc" }, { dueAt: "asc" }],
      take: 50,
    }),
    db.regulatoryReport.findMany({
      where: { projectId: { in: scopedProjectIds }, generatedAt: { gte: reportCutoff } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { generatedAt: "desc" },
      take: 100,
    }),
    db.companyApproval.findMany({
      where: { organizationId: user.organizationId, reviewedById: user.id },
      include: { requestedBy: { select: { fullName: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        OR: [
          { companyAssignments: { some: { active: true } } },
          { memberships: { some: { projectId: { in: scopedProjectIds } } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        role: true,
        companyAssignments: {
          where: { organizationId: user.organizationId, active: true },
          select: { role: true },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    db.stoppageEntry.findMany({
      where: { projectId: { in: scopedProjectIds }, startTime: { lte: now }, endTime: { gte: now } },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: { startTime: "asc" },
      take: 50,
    }),
  ]);

  const reportedProjectIds = new Set(recentReports.map((report) => report.projectId));
  const reportExceptions = portfolio.projects.filter((project) => project.status === "ACTIVE" && !reportedProjectIds.has(project.id)).map((project) => ({ id: project.id, code: project.code, name: project.name, issue: "No regulatory report generated in the last 30 days" }));
  const projectsRequiringAttention = portfolio.projects
    .filter((project) => project.status === "ACTIVE" && (project.scheduleVariance <= -10 || (project.spi !== null && project.spi < 0.9) || (project.cpi !== null && project.cpi < 0.9) || project.criticalActivities > 0))
    .sort((a, b) => a.scheduleVariance - b.scheduleVariance);
  const openInterventions = interventions.filter((item) => openInterventionStatuses.includes(item.status));

  return {
    portfolio,
    approvals,
    interventions,
    safetyIncidents,
    auditFindings,
    regulatoryReports: recentReports,
    reportExceptions,
    decisionHistory,
    managers: managers
      .filter((manager) => manager.id !== user.id)
      .filter((manager) => manager.role !== "ADMIN")
      .filter((manager) => !manager.companyAssignments.some((assignment) => assignment.role === "GENERAL_MANAGER" || assignment.role === "INTERNAL_AUDITOR"))
      .map(({ companyAssignments: _companyAssignments, ...manager }) => manager),
    stoppages,
    projectsRequiringAttention,
    executiveMetrics: {
      pendingDecisions: approvals.length,
      openInterventions: openInterventions.length,
      overdueInterventions: openInterventions.filter((item) => item.dueAt < now).length,
      criticalInterventions: openInterventions.filter((item) => item.priority === "CRITICAL").length,
      projectsRequiringAttention: projectsRequiringAttention.length,
      openSafetyIncidents: safetyIncidents.length,
      openAuditFindings: auditFindings.length,
      complianceExceptions: reportExceptions.length,
      activeStoppages: stoppages.length,
    },
  };
}

export async function listExecutiveInterventions(user: SessionUser) {
  const isGeneralManager = await hasCompanyRole(user, "GENERAL_MANAGER");
  return db.executiveIntervention.findMany({
    where: {
      organizationId: user.organizationId,
      ...(isGeneralManager ? {} : { accountableUserId: user.id }),
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      accountableUser: { select: { id: true, fullName: true, jobTitle: true } },
      createdBy: { select: { fullName: true } },
      closedBy: { select: { fullName: true } },
      events: { include: { author: { select: { fullName: true, jobTitle: true } } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
  });
}

export async function createExecutiveIntervention(user: SessionUser, input: {
  projectId: string;
  category: ExecutiveInterventionCategory;
  priority: ExecutiveInterventionPriority;
  title: string;
  description: string;
  requiredAction: string;
  accountableUserId: string;
  dueAt: string;
  sourceType?: string;
  sourceId?: string;
}) {
  await assertGeneralManager(user);
  await assertCompanyPermission(user, "executive_intervention", "create");
  const [project, accountableUser] = await Promise.all([
    db.project.findFirst({ where: { id: input.projectId, ...orgProjectWhere(user.organizationId) } }),
    db.user.findFirst({ where: { id: input.accountableUserId, organizationId: user.organizationId, active: true } }),
  ]);
  if (!project) throw new PermissionError("Project is outside the General Manager's organization portfolio");
  if (!accountableUser) throw new PermissionError("Accountable manager is not active in this organization");
  const dueAt = new Date(input.dueAt);
  if (dueAt <= new Date()) throw new PermissionError("Intervention due date must be in the future");
  return db.$transaction(async (tx) => {
    const intervention = await tx.executiveIntervention.create({ data: { organizationId: user.organizationId, projectId: input.projectId, category: input.category, priority: input.priority, title: input.title, description: input.description, requiredAction: input.requiredAction, accountableUserId: input.accountableUserId, createdById: user.id, dueAt, sourceType: input.sourceType, sourceId: input.sourceId } });
    await tx.executiveInterventionEvent.create({ data: { interventionId: intervention.id, type: "CREATED", authorId: user.id, comment: input.requiredAction, newStatus: "OPEN", newDueAt: dueAt } });
    await tx.auditLog.create({ data: { entityType: "ExecutiveIntervention", entityId: intervention.id, action: "CREATE", userId: user.id, diff: { projectId: input.projectId, category: input.category, priority: input.priority, accountableUserId: input.accountableUserId, dueAt: input.dueAt } } });
    return intervention;
  });
}

export async function respondToExecutiveIntervention(user: SessionUser, interventionId: string, input: { comment: string; status: ManagementInterventionStatus }) {
  const intervention = await db.executiveIntervention.findFirst({ where: { id: interventionId, organizationId: user.organizationId } });
  if (!intervention) throw new PermissionError("Executive intervention not found");
  if (intervention.accountableUserId !== user.id) throw new PermissionError("Only the accountable manager may respond to this intervention");
  if (!canManagementTransitionIntervention(intervention.status, input.status)) {
    throw new PermissionError(`Intervention cannot move from ${intervention.status} to ${input.status}`);
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.executiveIntervention.update({ where: { id: intervention.id }, data: { status: input.status } });
    await tx.executiveInterventionEvent.create({ data: { interventionId: intervention.id, type: "MANAGEMENT_RESPONSE", authorId: user.id, comment: input.comment, oldStatus: intervention.status, newStatus: input.status } });
    await tx.auditLog.create({ data: { entityType: "ExecutiveIntervention", entityId: intervention.id, action: "UPDATE", userId: user.id, diff: { oldStatus: intervention.status, newStatus: input.status, managementResponse: input.comment } } });
    return updated;
  });
}

export async function directExecutiveIntervention(user: SessionUser, interventionId: string, input: { comment: string; status?: "OPEN" | "ACTION_IN_PROGRESS" | "CLOSED" | "CANCELLED"; dueAt?: string }) {
  await assertGeneralManager(user);
  await assertCompanyPermission(user, "executive_intervention", "update");
  const intervention = await db.executiveIntervention.findFirst({ where: { id: interventionId, organizationId: user.organizationId } });
  if (!intervention) throw new PermissionError("Executive intervention not found");
  if (isTerminalExecutiveIntervention(intervention.status)) throw new PermissionError("Closed or cancelled interventions are immutable");
  if (input.status === "CLOSED" && !canCloseExecutiveIntervention(intervention.status)) throw new PermissionError("Management must mark the intervention ready for review before CEO closure");
  const dueAt = input.dueAt ? new Date(input.dueAt) : intervention.dueAt;
  if (input.dueAt && dueAt <= new Date()) throw new PermissionError("Revised due date must be in the future");
  const nextStatus = input.status ?? intervention.status;
  return db.$transaction(async (tx) => {
    const updated = await tx.executiveIntervention.update({ where: { id: intervention.id }, data: { status: nextStatus, dueAt, closedById: nextStatus === "CLOSED" ? user.id : null, closedAt: nextStatus === "CLOSED" ? new Date() : null } });
    await tx.executiveInterventionEvent.create({ data: { interventionId: intervention.id, type: input.dueAt && !input.status ? "DUE_DATE_CHANGE" : input.status ? "STATUS_CHANGE" : "CEO_DIRECTION", authorId: user.id, comment: input.comment, oldStatus: intervention.status, newStatus: nextStatus, oldDueAt: intervention.dueAt, newDueAt: dueAt } });
    await tx.auditLog.create({ data: { entityType: "ExecutiveIntervention", entityId: intervention.id, action: nextStatus === "CLOSED" ? "APPROVE" : "UPDATE", userId: user.id, diff: { oldStatus: intervention.status, newStatus: nextStatus, oldDueAt: intervention.dueAt, newDueAt: dueAt, direction: input.comment } } });
    return updated;
  });
}
