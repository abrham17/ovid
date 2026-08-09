import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import type {
  CreateEmployeeInput,
  CreateAssignmentInput,
  CreateAttendanceInput,
  CreateEquipmentInput,
  CreateUsageLogInput,
} from "@/lib/validations/resources";
import { Prisma } from "@/generated/prisma/client";
import {
  getEffectiveScope,
  assertScopeWritable,
  scopeWbsFilter,
} from "@/lib/scope";

/**
 * Labor & Equipment — scoped to org roster + visible WBS assignments.
 */

export async function listResources(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "labor", "read");

  const scope = await getEffectiveScope(user, projectId);
  const wbsFilter = scopeWbsFilter(scope);

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { contractorOrgId: true },
  });

  // Subcontractor sees their own org roster; contractor/others see contractor org
  const rosterOrgId =
    user.partyType === "SUBCONTRACTOR" ? user.organizationId : project.contractorOrgId;

  const [employees, assignments, equipment, usageLogs] = await Promise.all([
    db.employee.findMany({
      where: { organizationId: rosterOrgId, active: true },
      orderBy: { fullName: "asc" },
      take: 100,
    }),
    db.laborAssignment.findMany({
      where: { wbsNode: { projectId }, ...wbsFilter },
      orderBy: { date: "desc" },
      take: 80,
      include: {
        employee: { select: { id: true, fullName: true, profession: true } },
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
    db.equipment.findMany({
      where: { organizationId: rosterOrgId, active: true },
      orderBy: { equipmentType: "asc" },
      take: 80,
    }),
    db.equipmentUsageLog.findMany({
      where: {
        projectId,
        ...(wbsFilter.wbsNodeId ? { wbsNodeId: wbsFilter.wbsNodeId } : {}),
      },
      orderBy: { date: "desc" },
      take: 80,
      include: {
        equipment: { select: { id: true, equipmentType: true, plateNo: true } },
        wbsNode: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  const utilization = usageLogs.reduce(
    (acc, log) => {
      const oh = Number(log.operatingHours);
      const ih = Number(log.idleHours);
      const dh = Number(log.downHours);
      acc.oh += oh;
      acc.ih += ih;
      acc.dh += dh;
      return acc;
    },
    { oh: 0, ih: 0, dh: 0 }
  );
  const totalH = utilization.oh + utilization.ih + utilization.dh;
  const utilizationPct = totalH > 0 ? (utilization.oh / totalH) * 100 : 0;

  return {
    employees,
    assignments,
    equipment,
    usageLogs,
    utilizationPct,
    hours: utilization,
  };
}

export async function createEmployee(
  user: SessionUser,
  projectId: string,
  input: CreateEmployeeInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "labor", "create");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { contractorOrgId: true },
  });

  return db.employee.create({
    data: {
      organizationId: project.contractorOrgId,
      fullName: input.fullName,
      profession: input.profession,
      employmentType: input.employmentType,
    },
  });
}

export async function createAssignment(
  user: SessionUser,
  projectId: string,
  input: CreateAssignmentInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "labor", "create");

  const wbs = await db.wbsNode.findFirst({
    where: { id: input.wbsNodeId, projectId },
  });
  if (!wbs) throw new Error("WBS node not found");
  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  return db.laborAssignment.create({
    data: {
      employeeId: input.employeeId,
      wbsNodeId: input.wbsNodeId,
      date: new Date(input.date),
      hoursOnTask: new Prisma.Decimal(input.hoursOnTask),
    },
  });
}

export async function createAttendance(
  user: SessionUser,
  projectId: string,
  input: CreateAttendanceInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "labor", "create");

  return db.laborAttendance.upsert({
    where: {
      employeeId_date: {
        employeeId: input.employeeId,
        date: new Date(input.date),
      },
    },
    create: {
      employeeId: input.employeeId,
      date: new Date(input.date),
      present: input.present,
      hours: new Prisma.Decimal(input.hours),
    },
    update: {
      present: input.present,
      hours: new Prisma.Decimal(input.hours),
    },
  });
}

export async function createEquipment(
  user: SessionUser,
  projectId: string,
  input: CreateEquipmentInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "equipment", "create");

  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { contractorOrgId: true },
  });

  return db.equipment.create({
    data: {
      organizationId: project.contractorOrgId,
      equipmentType: input.equipmentType,
      plateNo: input.plateNo ?? null,
      serialNo: input.serialNo ?? null,
    },
  });
}

export async function createUsageLog(
  user: SessionUser,
  projectId: string,
  input: CreateUsageLogInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "equipment", "create");

  const wbs = await db.wbsNode.findFirst({
    where: { id: input.wbsNodeId, projectId },
  });
  if (!wbs) throw new Error("WBS node not found");

  return db.equipmentUsageLog.create({
    data: {
      equipmentId: input.equipmentId,
      wbsNodeId: input.wbsNodeId,
      projectId,
      date: new Date(input.date),
      operatingHours: new Prisma.Decimal(input.operatingHours),
      idleHours: new Prisma.Decimal(input.idleHours ?? 0),
      downHours: new Prisma.Decimal(input.downHours ?? 0),
    },
  });
}
