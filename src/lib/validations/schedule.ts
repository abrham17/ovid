import { z } from "zod";
import { dateStringSchema, percentageSchema } from "./common";

export const createActivitySchema = z.object({
  wbsNodeId: z.string().cuid(),
  name: z.string().min(2).max(200),
  baselineStart: dateStringSchema,
  baselineFinish: dateStringSchema,
  plannedStart: dateStringSchema,
  plannedFinish: dateStringSchema,
  actualStart: dateStringSchema.optional().nullable(),
  actualFinish: dateStringSchema.optional().nullable(),
  progressPercent: percentageSchema.optional().default(0),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "ON_HOLD"]).default("NOT_STARTED"),
});

export const updateActivitySchema = createActivitySchema.partial().extend({
  wbsNodeId: z.string().cuid().optional(),
});

export const createDependencySchema = z.object({
  predecessorId: z.string().cuid(),
  successorId: z.string().cuid(),
  dependencyType: z.enum(["FS", "SS", "FF", "SF"]).default("FS"),
  lagDays: z.number().int().default(0),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type CreateDependencyInput = z.infer<typeof createDependencySchema>;
