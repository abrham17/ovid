import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";
import {
  getEffectiveScope,
  getOrganizationScope,
  isAll,
} from "@/lib/scope";
import type { SectionAssignmentRole } from "@/generated/prisma/enums";

/** Only main-contractor PM tier may assign WBS sections to Subcontractor PMs. */
const SECTION_ASSIGNERS = new Set(["SENIOR_PM", "DEPUTY_PM", "ADMIN"]);

export async function listSectionAssignments(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "read");

  return db.sectionAssignment.findMany({
    where: { projectId, endedAt: null },
    include: {
      user: { select: { id: true, fullName: true, role: true, email: true } },
      assignedBy: { select: { id: true, fullName: true } },
      wbsNode: { select: { id: true, code: true, name: true, nodeType: true } },
    },
    orderBy: [{ assignedAt: "desc" }],
  });
}

export async function assignToSection(
  user: SessionUser,
  projectId: string,
  targetUserId: string,
  wbsNodeId: string,
  role: SectionAssignmentRole = "SUBCONTRACTOR_OWNER"
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "assignment", "create");

  if (!SECTION_ASSIGNERS.has(user.role)) {
    throw new DomainError(
      "Only Senior or Deputy Project Managers can assign WBS sections to Subcontractor PMs",
      403
    );
  }

  if (role !== "SUBCONTRACTOR_OWNER") {
    throw new DomainError(
      "WBS section assignment is only supported for Subcontractor PMs",
      400
    );
  }

  const wbs = await db.wbsNode.findFirst({
    where: { id: wbsNodeId, projectId },
    select: { id: true, projectId: true },
  });
  if (!wbs) throw new DomainError("WBS node not found in this project", 404);

  const assignerScope = await getEffectiveScope(user, projectId);
  if (!isAll(assignerScope.orgVisibleWbsNodeIds)) {
    if (!assignerScope.orgVisibleWbsNodeIds.has(wbsNodeId)) {
      throw new DomainError(
        "WBS node is outside your organization's contractual scope",
        403
      );
    }
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, organizationId: true },
  });
  if (!target) throw new DomainError("Target user not found", 404);

  if (target.role !== "SUBCONTRACTOR_PM") {
    throw new DomainError(
      "Section ownership can only be assigned to a Subcontractor Project Manager",
      400
    );
  }

  const membership = await db.projectMembership.findFirst({
    where: { projectId, userId: targetUserId },
  });
  if (!membership) {
    throw new DomainError("Target user is not a member of this project", 400);
  }

  await db.sectionAssignment.updateMany({
    where: {
      projectId,
      userId: targetUserId,
      wbsNodeId,
      endedAt: null,
    },
    data: { endedAt: new Date() },
  });

  const assignment = await db.sectionAssignment.create({
    data: {
      projectId,
      userId: targetUserId,
      wbsNodeId,
      role: "SUBCONTRACTOR_OWNER",
      assignedById: user.id,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      wbsNode: { select: { id: true, code: true, name: true } },
      assignedBy: { select: { id: true, fullName: true } },
    },
  });

  // Keep org Layer-1 ceiling in sync so the subcontractor party can see this branch
  await db.contract.updateMany({
    where: {
      projectId,
      contractorOrgId: target.organizationId,
      status: "ACTIVE",
    },
    data: { scopeWbsNodeId: wbsNodeId },
  });

  return assignment;
}

export async function unassignFromSection(user: SessionUser, assignmentId: string) {
  const assignment = await db.sectionAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) throw new DomainError("Section assignment not found", 404);

  await assertProjectAccess(user, assignment.projectId);
  assertPermission(user, "assignment", "update");

  if (!SECTION_ASSIGNERS.has(user.role)) {
    throw new DomainError(
      "Only Senior or Deputy Project Managers can end section assignments",
      403
    );
  }

  return db.sectionAssignment.update({
    where: { id: assignmentId },
    data: { endedAt: new Date() },
  });
}

export async function assertWbsInOrgCeiling(
  user: SessionUser,
  projectId: string,
  wbsNodeId: string
) {
  const org = await getOrganizationScope(user, projectId);
  if (isAll(org.visibleWbsNodeIds)) return;
  if (!org.visibleWbsNodeIds.has(wbsNodeId)) {
    throw new DomainError("Outside organization WBS ceiling", 403);
  }
}
