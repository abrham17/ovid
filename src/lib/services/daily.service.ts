import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError, assertStatusTransition, DAILY_TRANSITIONS } from "@/lib/domain-rules";
import type {
  EarthworkEntryInput,
  StructureEntryInput,
  RebarEntryInput,
} from "@/lib/validations/daily";
import { Prisma } from "@/generated/prisma/client";
import {
  getEffectiveScope,
  assertScopeWritable,
  scopeWbsFilter,
  isWbsVisible,
} from "@/lib/scope";

const wbsSelect = { id: true, code: true, name: true } as const;

function dateFilter(from?: string, to?: string) {
  if (!from && !to) return {};
  return {
    date: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  };
}

export async function listDailyReports(
  user: SessionUser,
  projectId: string,
  opts?: {
    from?: string;
    to?: string;
    type?: "earthwork" | "structure" | "rebar";
    status?: string;
  }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "daily_report", "read");

  const scope = await getEffectiveScope(user, projectId);
  const wbsFilter = scopeWbsFilter(scope);

  const baseWhere = {
    projectId,
    ...wbsFilter,
    ...dateFilter(opts?.from, opts?.to),
    ...(opts?.status ? { status: opts.status as any } : {}),
  };

  const [earthwork, structure, rebar] = await Promise.all([
    !opts?.type || opts.type === "earthwork"
      ? db.earthworkDailyEntry.findMany({
          where: baseWhere,
          orderBy: { date: "desc" },
          take: 100,
          include: {
            wbsNode: { select: wbsSelect },
            createdBy: { select: { id: true, fullName: true } },
          },
        })
      : [],
    !opts?.type || opts.type === "structure"
      ? db.structureDailyEntry.findMany({
          where: baseWhere,
          orderBy: { date: "desc" },
          take: 100,
          include: {
            wbsNode: { select: wbsSelect },
            createdBy: { select: { id: true, fullName: true } },
          },
        })
      : [],
    !opts?.type || opts.type === "rebar"
      ? db.rebarDailyEntry.findMany({
          where: baseWhere,
          orderBy: { date: "desc" },
          take: 100,
          include: {
            wbsNode: { select: wbsSelect },
            createdBy: { select: { id: true, fullName: true } },
          },
        })
      : [],
  ]);

  return { earthwork, structure, rebar };
}

export async function createEarthworkEntry(user: SessionUser, input: EarthworkEntryInput) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "daily_report", "create");
  const scope = await getEffectiveScope(user, input.projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  return db.earthworkDailyEntry.create({
    data: {
      projectId: input.projectId,
      wbsNodeId: input.wbsNodeId,
      date: new Date(input.date),
      station: input.station,
      activityDescription: input.activityDescription,
      equipmentType: input.equipmentType,
      equipmentPlateNo: input.equipmentPlateNo,
      operatingHours:
        input.operatingHours != null ? new Prisma.Decimal(input.operatingHours) : null,
      idleHours: input.idleHours != null ? new Prisma.Decimal(input.idleHours) : null,
      downHours: input.downHours != null ? new Prisma.Decimal(input.downHours) : null,
      quantityLength:
        input.quantityLength != null ? new Prisma.Decimal(input.quantityLength) : null,
      quantityWidth:
        input.quantityWidth != null ? new Prisma.Decimal(input.quantityWidth) : null,
      quantityDepth:
        input.quantityDepth != null ? new Prisma.Decimal(input.quantityDepth) : null,
      manpower: input.manpower ?? undefined,
      remark: input.remark,
      status: "DRAFT",
      createdById: user.id,
    },
    include: { wbsNode: { select: wbsSelect } },
  });
}

export async function createStructureEntry(user: SessionUser, input: StructureEntryInput) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "daily_report", "create");
  const scope = await getEffectiveScope(user, input.projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  return db.structureDailyEntry.create({
    data: {
      projectId: input.projectId,
      wbsNodeId: input.wbsNodeId,
      date: new Date(input.date),
      activityDescription: input.activityDescription,
      designQuantity:
        input.designQuantity != null ? new Prisma.Decimal(input.designQuantity) : null,
      actualQuantity:
        input.actualQuantity != null ? new Prisma.Decimal(input.actualQuantity) : null,
      materialUsed: input.materialUsed,
      concreteGrade: input.concreteGrade,
      labour: input.labour ?? undefined,
      equipmentType: input.equipmentType,
      equipmentSerialNo: input.equipmentSerialNo,
      operatingHours:
        input.operatingHours != null ? new Prisma.Decimal(input.operatingHours) : null,
      idleHours: input.idleHours != null ? new Prisma.Decimal(input.idleHours) : null,
      downHours: input.downHours != null ? new Prisma.Decimal(input.downHours) : null,
      remark: input.remark,
      status: "DRAFT",
      createdById: user.id,
    },
    include: { wbsNode: { select: wbsSelect } },
  });
}

export async function createRebarEntry(user: SessionUser, input: RebarEntryInput) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "daily_report", "create");
  const scope = await getEffectiveScope(user, input.projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  const factor = await db.weightFactor.findUnique({
    where: { diameterMm: input.diameterMm },
  });

  const totalBars = input.numberOfBars * input.numberOfFaces;
  const computedWeightKg = factor
    ? totalBars * input.lengthM * Number(factor.kgPerMeter)
    : null;

  return db.rebarDailyEntry.create({
    data: {
      projectId: input.projectId,
      wbsNodeId: input.wbsNodeId,
      date: new Date(input.date),
      barDesignation: input.barDesignation,
      diameterMm: input.diameterMm,
      numberOfBars: input.numberOfBars,
      lengthM: new Prisma.Decimal(input.lengthM),
      numberOfFaces: input.numberOfFaces,
      computedWeightKg:
        computedWeightKg != null ? new Prisma.Decimal(computedWeightKg) : null,
      shape: input.shape,
      labour: input.labour ?? undefined,
      remark: input.remark,
      status: "DRAFT",
      createdById: user.id,
    },
    include: { wbsNode: { select: wbsSelect } },
  });
}

export async function submitDailyEntry(
  user: SessionUser,
  type: "earthwork" | "structure" | "rebar",
  entryId: string
) {
  assertPermission(user, "daily_report", "update");

  const model =
    type === "earthwork"
      ? db.earthworkDailyEntry
      : type === "structure"
        ? db.structureDailyEntry
        : db.rebarDailyEntry;

  const entry = await (model as any).findUniqueOrThrow({ where: { id: entryId } });
  await assertProjectAccess(user, entry.projectId);
  const scope = await getEffectiveScope(user, entry.projectId);
  assertScopeWritable(scope, entry.wbsNodeId);

  assertStatusTransition(entry.status, "SUBMITTED", DAILY_TRANSITIONS, "Daily report");

  return (model as any).update({
    where: { id: entryId },
    data: { status: "SUBMITTED" },
  });
}

export async function approveDailyEntry(
  user: SessionUser,
  type: "earthwork" | "structure" | "rebar",
  entryId: string
) {
  assertPermission(user, "daily_report", "approve");

  const model =
    type === "earthwork"
      ? db.earthworkDailyEntry
      : type === "structure"
        ? db.structureDailyEntry
        : db.rebarDailyEntry;

  const entry = await (model as any).findUniqueOrThrow({ where: { id: entryId } });
  await assertProjectAccess(user, entry.projectId);
  const scope = await getEffectiveScope(user, entry.projectId);
  if (!isWbsVisible(scope.visibleWbsNodeIds, entry.wbsNodeId)) {
    throw new DomainError("Entry is outside your visible scope", 403);
  }

  assertStatusTransition(entry.status, "APPROVED", DAILY_TRANSITIONS, "Daily report");

  return (model as any).update({
    where: { id: entryId },
    data: { status: "APPROVED" },
  });
}
