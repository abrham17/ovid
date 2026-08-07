import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { assertStatusTransition, DEFECT_TRANSITIONS, PUNCH_TRANSITIONS } from "@/lib/domain-rules";
import type {
  CreateItrInput,
  CreateDefectInput,
  CreatePunchInput,
} from "@/lib/validations/quality";

async function assertWbs(projectId: string, wbsNodeId: string) {
  const n = await db.wbsNode.findFirst({ where: { id: wbsNodeId, projectId } });
  if (!n) throw new Error("WBS node not found on this project");
  return n;
}

export async function listQuality(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "quality", "read");

  const [itrs, defects, punches] = await Promise.all([
    db.inspectionTestRecord.findMany({
      where: { wbsNode: { projectId } },
      orderBy: { inspectedAt: "desc" },
      take: 80,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        inspectedBy: { select: { id: true, fullName: true } },
        _count: { select: { defects: true } },
      },
    }),
    db.defectLog.findMany({
      where: { wbsNode: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        linkedItr: { select: { id: true, inspectionType: true, result: true } },
        responsibleOrg: { select: { id: true, name: true } },
      },
    }),
    db.punchListItem.findMany({
      where: { wbsNode: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  return { itrs, defects, punches };
}

export async function createItr(
  user: SessionUser,
  projectId: string,
  input: CreateItrInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "quality", "create");
  await assertWbs(projectId, input.wbsNodeId);

  return db.inspectionTestRecord.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      inspectionType: input.inspectionType,
      result: input.result,
      inspectedByUserId: user.id,
      inspectedAt: new Date(input.inspectedAt),
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      inspectedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function createDefect(
  user: SessionUser,
  projectId: string,
  input: CreateDefectInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "quality", "create");
  await assertWbs(projectId, input.wbsNodeId);

  return db.defectLog.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      linkedItrId: input.linkedItrId ?? null,
      description: input.description,
      responsibleOrgId: input.responsibleOrgId ?? null,
      reworkDelayDays: input.reworkDelayDays ?? null,
      status: "OPEN",
    },
  });
}

export async function updateDefectStatus(
  user: SessionUser,
  projectId: string,
  defectId: string,
  status: "OPEN" | "REWORK_IN_PROGRESS" | "VERIFIED_CLOSED"
) {
  await assertProjectAccess(user, projectId);
  const defect = await db.defectLog.findFirst({
    where: { id: defectId, wbsNode: { projectId } },
  });
  if (!defect) throw new Error("Defect not found");

  assertStatusTransition(defect.status, status, DEFECT_TRANSITIONS, "Defect status");

  if (status === "VERIFIED_CLOSED") {
    assertPermission(user, "quality", "approve");
  } else {
    assertPermission(user, "quality", "update");
  }

  return db.defectLog.update({ where: { id: defectId }, data: { status } });
}

export async function createPunch(
  user: SessionUser,
  projectId: string,
  input: CreatePunchInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "quality", "create");
  await assertWbs(projectId, input.wbsNodeId);

  return db.punchListItem.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      description: input.description,
      severity: input.severity,
      patternTag: input.patternTag ?? null,
      status: "OPEN",
    },
  });
}

export async function updatePunchStatus(
  user: SessionUser,
  projectId: string,
  punchId: string,
  status: "OPEN" | "RESOLVED" | "VERIFIED"
) {
  await assertProjectAccess(user, projectId);
  const punch = await db.punchListItem.findFirst({
    where: { id: punchId, wbsNode: { projectId } },
  });
  if (!punch) throw new Error("Punch item not found");

  assertStatusTransition(punch.status, status, PUNCH_TRANSITIONS, "Punch status");

  if (status === "VERIFIED") {
    assertPermission(user, "quality", "approve");
  } else {
    assertPermission(user, "quality", "update");
  }

  return db.punchListItem.update({ where: { id: punchId }, data: { status } });
}
