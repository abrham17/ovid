import { db } from "@/lib/db";
import { getOrganizationScope } from "@/lib/rbac/organizationScope";
import type { SessionUser } from "@/lib/rbac";

export async function assertWbsNodeInProject(
  projectId: string,
  wbsNodeId: string | null | undefined
) {
  if (!wbsNodeId) return;
  const node = await db.wbsNode.findFirst({
    where: { id: wbsNodeId, projectId },
    select: { id: true },
  });
  if (!node) throw new Error("Selected WBS node does not belong to this project.");
}

export async function assertWbsNodeVisibleToUser(
  user: SessionUser,
  projectId: string,
  wbsNodeId: string | null | undefined
) {
  if (!wbsNodeId) return;
  const scope = await getOrganizationScope(user, projectId);
  if (!scope) throw new Error("Not a member of this project.");
  await assertWbsNodeInProject(projectId, wbsNodeId);
  if (
    scope.visibleWbsNodeIds !== "ALL" &&
    !scope.visibleWbsNodeIds.includes(wbsNodeId)
  ) {
    throw new Error("Selected WBS node is outside your project scope.");
  }
}

export async function assertProjectMember(projectId: string, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true },
  });
  if (!user) throw new Error("Selected owner does not exist.");

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { contractorOrgId: user.organizationId },
        { clientOrgId: user.organizationId },
        { consultantOrgId: user.organizationId },
        { memberships: { some: { userId, organizationId: user.organizationId } } },
      ],
    },
    select: { id: true },
  });
  if (!project) throw new Error("Selected user is not a member of this project.");
}

export async function assertScheduleActivityInProject(
  projectId: string,
  scheduleActivityId: string | null | undefined
) {
  if (!scheduleActivityId) return;
  const activity = await db.scheduleActivity.findFirst({
    where: { id: scheduleActivityId, wbsNode: { projectId } },
    select: { id: true },
  });
  if (!activity) throw new Error("Selected activity does not belong to this project.");
}

export async function assertObservationInProject(projectId: string, observationId: string) {
  const observation = await db.safetyObservation.findFirst({
    where: { id: observationId, wbsNode: { projectId } },
    select: { id: true },
  });
  if (!observation) throw new Error("Selected observation does not belong to this project.");
}

export async function assertStructuralElementInProject(
  projectId: string,
  structuralElementId: string
) {
  const element = await db.structuralElement.findFirst({
    where: { id: structuralElementId, wbsNode: { projectId } },
    select: { id: true },
  });
  if (!element) throw new Error("Selected structural element does not belong to this project.");
}

export async function assertDocumentInProject(projectId: string, documentId: string) {
  const document = await db.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: { id: true },
  });
  if (!document) throw new Error("Selected document does not belong to this project.");
}
