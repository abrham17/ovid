import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError, assertDateOrder } from "@/lib/domain-rules";
import type { CreateStoppageInput, UpdateStoppageInput } from "@/lib/validations/stoppage";

/**
 * Stoppage / Delay-Cause Log — highest-leverage schedule feature for Ovid.
 * Digital twin of the three-party On-Site Work Stoppage Report.
 * Links delay cause + responsible party to WBS / schedule activity in real time.
 */
export async function listStoppages(
  user: SessionUser,
  projectId: string,
  opts?: { from?: string; to?: string; type?: string }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "schedule", "read");

  return db.stoppageEntry.findMany({
    where: {
      projectId,
      ...(opts?.type ? { stoppageType: opts.type as any } : {}),
      ...(opts?.from || opts?.to
        ? {
            startTime: {
              ...(opts.from ? { gte: new Date(opts.from) } : {}),
              ...(opts.to ? { lte: new Date(opts.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { startTime: "desc" },
    take: 100,
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      scheduleActivity: { select: { id: true, name: true, status: true } },
    },
  });
}

export async function createStoppage(user: SessionUser, input: CreateStoppageInput) {
  await assertProjectAccess(user, input.projectId);
  assertPermission(user, "schedule", "create");

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  assertDateOrder(start, end, "Stoppage");

  return db.stoppageEntry.create({
    data: {
      projectId: input.projectId,
      wbsNodeId: input.wbsNodeId,
      scheduleActivityId: input.scheduleActivityId,
      stoppageType: input.stoppageType,
      reason: input.reason,
      stationFrom: input.stationFrom,
      stationTo: input.stationTo,
      startTime: start,
      endTime: end,
      resourcesAssigned: input.resourcesAssigned ?? undefined,
      inspectorComment: input.inspectorComment,
      contractorRepComment: input.contractorRepComment,
      residentEngineerComment: input.residentEngineerComment,
      responsibleParty: input.responsibleParty,
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      scheduleActivity: { select: { id: true, name: true } },
    },
  });
}

export async function updateStoppage(
  user: SessionUser,
  stoppageId: string,
  input: UpdateStoppageInput
) {
  const existing = await db.stoppageEntry.findUniqueOrThrow({ where: { id: stoppageId } });
  await assertProjectAccess(user, existing.projectId);
  assertPermission(user, "schedule", "update");

  return db.stoppageEntry.update({
    where: { id: stoppageId },
    data: {
      ...input,
      startTime: input.startTime ? new Date(input.startTime) : undefined,
      endTime: input.endTime ? new Date(input.endTime) : undefined,
      resourcesAssigned: input.resourcesAssigned ?? undefined,
    },
  });
}

/** Assign delay responsibility after three-party comments are in (Senior PM / Contracts). */
export async function assignResponsibility(
  user: SessionUser,
  stoppageId: string,
  responsibleParty: "CLIENT" | "CONSULTANT" | "CONTRACTOR" | "SUBCONTRACTOR" | "NEUTRAL"
) {
  const existing = await db.stoppageEntry.findUniqueOrThrow({ where: { id: stoppageId } });
  await assertProjectAccess(user, existing.projectId);
  assertPermission(user, "schedule", "update");

  return db.stoppageEntry.update({
    where: { id: stoppageId },
    data: { responsibleParty },
  });
}

/** Duration in hours for variance / claims. */
export function stoppageDurationHours(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}
