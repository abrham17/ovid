import { z } from "zod";
import { dateStringSchema } from "./common";

export const createStoppageSchema = z.object({
  projectId: z.string().cuid(),
  wbsNodeId: z.string().cuid().optional().nullable(),
  scheduleActivityId: z.string().cuid().optional().nullable(),
  stoppageType: z.enum([
    "WEATHER",
    "DESIGN_CHANGE",
    "MATERIAL_SHORTAGE",
    "CLIENT_INSTRUCTION",
    "EQUIPMENT_BREAKDOWN",
    "LABOR_DISPUTE",
    "FORCE_MAJEURE",
    "CONTRACTOR_DEFAULT",
    "OTHER",
  ]),
  reason: z.string().min(3).max(2000),
  stationFrom: z.string().max(80).optional().nullable(),
  stationTo: z.string().max(80).optional().nullable(),
  startTime: dateStringSchema, // ISO datetime or date
  endTime: dateStringSchema,
  resourcesAssigned: z
    .object({
      equipment: z.array(z.object({ type: z.string(), count: z.number().optional() })).optional(),
      manpower: z.array(z.object({ title: z.string(), count: z.number() })).optional(),
    })
    .optional()
    .nullable(),
  inspectorComment: z.string().max(2000).optional().nullable(),
  contractorRepComment: z.string().max(2000).optional().nullable(),
  residentEngineerComment: z.string().max(2000).optional().nullable(),
  responsibleParty: z
    .enum(["CLIENT", "CONSULTANT", "CONTRACTOR", "SUBCONTRACTOR", "NEUTRAL"])
    .optional()
    .nullable(),
});

export const updateStoppageSchema = createStoppageSchema
  .omit({ projectId: true })
  .partial();

export type CreateStoppageInput = z.infer<typeof createStoppageSchema>;
export type UpdateStoppageInput = z.infer<typeof updateStoppageSchema>;
