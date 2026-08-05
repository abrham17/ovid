"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireUser,
  getProjectParty,
  canLogSafetyObservation,
  canEscalateSafetyIncident,
  canCloseSafetyIncident,
} from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { SafetySeverity } from "@/generated/prisma/enums";

const createObservationSchema = z.object({
  projectId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  hazardDescription: z.string().min(3),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  immediateActionTaken: z.string().optional(),
  observedAt: z.coerce.date(),
});

export async function createSafetyObservation(formData: FormData) {
  const user = await requireUser();
  const parsed = createObservationSchema.parse({
    projectId: formData.get("projectId"),
    wbsNodeId: formData.get("wbsNodeId"),
    hazardDescription: formData.get("hazardDescription"),
    severity: formData.get("severity"),
    immediateActionTaken: formData.get("immediateActionTaken") || undefined,
    observedAt: formData.get("observedAt"),
  });

  const party = await getProjectParty(user, parsed.projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may log safety observations.");
  }
  if (!canLogSafetyObservation(user.role)) {
    throw new Error("Your role is not authorized to log safety observations.");
  }

  const obs = await db.safetyObservation.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      observedByUserId: user.id,
      hazardDescription: parsed.hazardDescription,
      severity: parsed.severity as SafetySeverity,
      immediateActionTaken: parsed.immediateActionTaken,
      observedAt: parsed.observedAt,
    },
  });
  await audit({ userId: user.id, entityType: "SafetyObservation", entityId: obs.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/safety`);
}

const escalateIncidentSchema = z.object({
  projectId: z.string().min(1),
  observationId: z.string().min(1),
  wbsNodeId: z.string().min(1),
  incidentType: z.enum(["NEAR_MISS", "FIRST_AID", "MEDICAL_TREATMENT", "LOST_TIME", "FATALITY"]),
  description: z.string().min(3),
  affectsScheduleActivityId: z.string().optional(),
});

export async function escalateToIncident(formData: FormData) {
  const user = await requireUser();
  const parsed = escalateIncidentSchema.parse({
    projectId: formData.get("projectId"),
    observationId: formData.get("observationId"),
    wbsNodeId: formData.get("wbsNodeId"),
    incidentType: formData.get("incidentType"),
    description: formData.get("description"),
    affectsScheduleActivityId: formData.get("affectsScheduleActivityId") || undefined,
  });

  const party = await getProjectParty(user, parsed.projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may escalate safety observations.");
  }
  if (!canEscalateSafetyIncident(user.role)) {
    throw new Error("Your role is not authorized to escalate an observation into an incident.");
  }

  const incident = await db.safetyIncident.create({
    data: {
      wbsNodeId: parsed.wbsNodeId,
      linkedObservationId: parsed.observationId,
      incidentType: parsed.incidentType,
      description: parsed.description,
      affectsScheduleActivityId: parsed.affectsScheduleActivityId,
      status: "OPEN",
    },
  });
  await audit({ userId: user.id, entityType: "SafetyIncident", entityId: incident.id, action: "CREATE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/safety`);
}

const closeIncidentSchema = z.object({
  projectId: z.string().min(1),
  incidentId: z.string().min(1),
  correctiveAction: z.string().min(3),
});

export async function closeSafetyIncident(formData: FormData) {
  const user = await requireUser();
  const parsed = closeIncidentSchema.parse({
    projectId: formData.get("projectId"),
    incidentId: formData.get("incidentId"),
    correctiveAction: formData.get("correctiveAction"),
  });

  if (!canCloseSafetyIncident(user.role)) {
    throw new Error("Only the HSE Officer may close safety incidents.");
  }
  const party = await getProjectParty(user, parsed.projectId);
  if (!party || party.partyType !== "CONTRACTOR") {
    throw new Error("Only contractor-side users may close safety incidents.");
  }

  await db.safetyIncident.update({
    where: { id: parsed.incidentId },
    data: {
      correctiveAction: parsed.correctiveAction,
      correctiveActionVerifiedByUserId: user.id,
      status: "CLOSED",
    },
  });
  await audit({ userId: user.id, entityType: "SafetyIncident", entityId: parsed.incidentId, action: "APPROVE", diff: parsed });
  revalidatePath(`/projects/${parsed.projectId}/safety`);
}