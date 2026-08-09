import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError, assertStatusTransition, INCIDENT_TRANSITIONS } from "@/lib/domain-rules";
import type {
  CreateObservationInput,
  CreateIncidentInput,
  UpdateIncidentInput,
} from "@/lib/validations/safety";
import {
  getEffectiveScope,
  assertScopeWritable,
  scopeWbsFilter,
  applyFieldRedactionList,
} from "@/lib/scope";

/**
 * Safety for Ovid PMS — observations + incidents with mandatory closeout.
 * HSE Officer: no individual narrowing (org ceiling only via EffectiveScope).
 * SE/Foreman: section/task scoped.
 */

async function assertWbsOnProject(wbsNodeId: string, projectId: string) {
  const node = await db.wbsNode.findFirst({
    where: { id: wbsNodeId, projectId },
  });
  if (!node) throw new Error("WBS node not found on this project");
  return node;
}

export async function listSafety(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "safety", "read");

  const scope = await getEffectiveScope(user, projectId);
  const wbsFilter = scopeWbsFilter(scope);

  const [observations, incidents] = await Promise.all([
    db.safetyObservation.findMany({
      where: { wbsNode: { projectId }, ...wbsFilter },
      orderBy: { observedAt: "desc" },
      take: 100,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        observedBy: { select: { id: true, fullName: true, role: true } },
        _count: { select: { incidents: true } },
      },
    }),
    db.safetyIncident.findMany({
      where: { wbsNode: { projectId }, ...wbsFilter },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        wbsNode: { select: { id: true, code: true, name: true } },
        linkedObservation: {
          select: { id: true, hazardDescription: true, severity: true },
        },
        correctiveActionVerifiedBy: {
          select: { id: true, fullName: true },
        },
        affectsScheduleActivity: {
          select: { id: true, name: true, status: true },
        },
      },
    }),
  ]);

  return {
    observations: applyFieldRedactionList(observations as any[], scope),
    incidents: applyFieldRedactionList(incidents as any[], scope),
  };
}

export async function createObservation(
  user: SessionUser,
  projectId: string,
  input: CreateObservationInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "safety", "create");
  await assertWbsOnProject(input.wbsNodeId, projectId);
  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  return db.safetyObservation.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      observedByUserId: user.id,
      hazardDescription: input.hazardDescription,
      severity: input.severity,
      immediateActionTaken: input.immediateActionTaken ?? null,
      observedAt: new Date(input.observedAt),
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      observedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function createIncident(
  user: SessionUser,
  projectId: string,
  input: CreateIncidentInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "safety", "create");
  await assertWbsOnProject(input.wbsNodeId, projectId);
  const scope = await getEffectiveScope(user, projectId);
  assertScopeWritable(scope, input.wbsNodeId);

  if (input.linkedObservationId) {
    const obs = await db.safetyObservation.findFirst({
      where: { id: input.linkedObservationId, wbsNode: { projectId } },
    });
    if (!obs) throw new Error("Linked observation not found on this project");
  }

  if (input.affectsScheduleActivityId) {
    const act = await db.scheduleActivity.findFirst({
      where: {
        id: input.affectsScheduleActivityId,
        wbsNode: { projectId },
      },
    });
    if (!act) throw new Error("Schedule activity not found on this project");
  }

  return db.safetyIncident.create({
    data: {
      wbsNodeId: input.wbsNodeId,
      linkedObservationId: input.linkedObservationId ?? null,
      incidentType: input.incidentType,
      description: input.description,
      correctiveAction: input.correctiveAction ?? null,
      status: input.status ?? "OPEN",
      affectsScheduleActivityId: input.affectsScheduleActivityId ?? null,
    },
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      affectsScheduleActivity: { select: { id: true, name: true } },
    },
  });
}

/**
 * Closeout workflow: OPEN → ACTION_PENDING → CLOSED.
 * Closing requires corrective action text and records verifier.
 * This is the mandatory closeout the design demands.
 */
export async function updateIncidentStatus(
  user: SessionUser,
  projectId: string,
  incidentId: string,
  status: "OPEN" | "ACTION_PENDING" | "CLOSED",
  correctiveAction?: string | null
) {
  await assertProjectAccess(user, projectId);

  const incident = await db.safetyIncident.findFirst({
    where: { id: incidentId, wbsNode: { projectId } },
  });
  if (!incident) throw new Error("Incident not found");
  assertStatusTransition(incident.status, status, INCIDENT_TRANSITIONS, "Incident status");

  if (status === "CLOSED") {
    assertPermission(user, "safety", "approve");
    const action = correctiveAction ?? incident.correctiveAction;
    if (!action || action.trim().length < 5) {
      throw new Error("Corrective action is required before closing an incident");
    }
    return db.safetyIncident.update({
      where: { id: incidentId },
      data: {
        status: "CLOSED",
        correctiveAction: action,
        correctiveActionVerifiedByUserId: user.id,
      },
    });
  }

  assertPermission(user, "safety", "update");
  return db.safetyIncident.update({
    where: { id: incidentId },
    data: {
      status,
      ...(correctiveAction != null ? { correctiveAction } : {}),
    },
  });
}

export async function updateIncident(
  user: SessionUser,
  projectId: string,
  incidentId: string,
  input: UpdateIncidentInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "safety", "update");

  const incident = await db.safetyIncident.findFirst({
    where: { id: incidentId, wbsNode: { projectId } },
  });
  if (!incident) throw new Error("Incident not found");
  if (incident.status === "CLOSED") {
    throw new Error("Closed incidents cannot be edited — reopen via status change if needed");
  }

  return db.safetyIncident.update({
    where: { id: incidentId },
    data: {
      description: input.description,
      correctiveAction: input.correctiveAction,
      status: input.status,
      affectsScheduleActivityId: input.affectsScheduleActivityId,
    },
  });
}

/** Open / action-pending incidents that block a schedule activity. */
export async function listBlockingIncidents(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "safety", "read");

  return db.safetyIncident.findMany({
    where: {
      wbsNode: { projectId },
      status: { in: ["OPEN", "ACTION_PENDING"] },
      affectsScheduleActivityId: { not: null },
    },
    include: {
      affectsScheduleActivity: { select: { id: true, name: true, status: true } },
      wbsNode: { select: { code: true, name: true } },
    },
  });
}
