import { z } from "zod";
import { dateStringSchema } from "./common";

export const createObservationSchema = z.object({
  wbsNodeId: z.string().cuid(),
  hazardDescription: z.string().min(5).max(2000),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  immediateActionTaken: z.string().max(2000).optional().nullable(),
  observedAt: dateStringSchema, // ISO date or datetime
});

export const createIncidentSchema = z.object({
  wbsNodeId: z.string().cuid(),
  linkedObservationId: z.string().cuid().optional().nullable(),
  incidentType: z.enum([
    "NEAR_MISS",
    "FIRST_AID",
    "MEDICAL_TREATMENT",
    "LOST_TIME",
    "FATALITY",
  ]),
  description: z.string().min(5).max(3000),
  correctiveAction: z.string().max(2000).optional().nullable(),
  affectsScheduleActivityId: z.string().cuid().optional().nullable(),
  status: z.enum(["OPEN", "ACTION_PENDING", "CLOSED"]).optional().default("OPEN"),
});

export const updateIncidentSchema = z.object({
  description: z.string().min(5).max(3000).optional(),
  correctiveAction: z.string().max(2000).optional().nullable(),
  status: z.enum(["OPEN", "ACTION_PENDING", "CLOSED"]).optional(),
  affectsScheduleActivityId: z.string().cuid().optional().nullable(),
});

export type CreateObservationInput = z.infer<typeof createObservationSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
