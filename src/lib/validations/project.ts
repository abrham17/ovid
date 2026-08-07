import { z } from "zod";
import { dateStringSchema, moneySchema } from "./common";

const optionalDate = dateStringSchema.optional().nullable();

export const createProjectSchema = z.object({
  name: z.string().min(3).max(200),
  code: z.string().min(2).max(30).regex(/^[A-Z0-9-]+$/, "Code must be uppercase alphanumeric with hyphens"),
  projectType: z.enum(["ROAD", "BUILDING", "HOUSING", "ENERGY", "GREEN_PARK", "OTHER"]),
  contractType: z.enum(["FIDIC_RED", "FIDIC_YELLOW", "ETHIO_STANDARD", "OTHER"]).default("FIDIC_RED"),
  status: z.enum(["PLANNING", "ACTIVE", "SUSPENDED", "COMPLETE", "CLOSED"]).default("PLANNING"),
  contractValue: moneySchema,
  plannedStartDate: dateStringSchema,
  plannedEndDate: dateStringSchema,
  /** Client organization id — required by schema */
  clientOrgId: z.string().cuid(),
  consultantOrgId: z.string().cuid().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createWbsNodeSchema = z.object({
  parentId: z.string().cuid().optional().nullable(),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  nodeType: z.enum([
    "PHASE",
    "SECTION",
    "FLOOR",
    "STATION_RANGE",
    "STRUCTURAL_ELEMENT",
    "ACTIVITY",
  ]),
  designReady: z.boolean().optional().default(false),
  plannedStartDate: optionalDate,
  plannedEndDate: optionalDate,
});

export const updateWbsNodeSchema = createWbsNodeSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateWbsNodeInput = z.infer<typeof createWbsNodeSchema>;
export type UpdateWbsNodeInput = z.infer<typeof updateWbsNodeSchema>;
