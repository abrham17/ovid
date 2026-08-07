import { z } from "zod";
import { dateStringSchema } from "./common";

/** Manpower line item (profession + count + hours) — matches IMS forms */
const manpowerLineSchema = z.object({
  profession: z.string().min(1).max(80),
  count: z.number().int().positive(),
  workingHours: z.number().nonnegative().optional(),
});

/**
 * Earth Work Daily Report — digital twin of typical Grade-1 IMS earthwork form.
 * Used on roads and foundation bulk dig for Ovid housing/building projects.
 */
export const earthworkEntrySchema = z.object({
  projectId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  date: dateStringSchema,
  station: z.string().max(80).optional().nullable(),
  activityDescription: z.string().min(2).max(500),
  equipmentType: z.string().max(80).optional().nullable(),
  equipmentPlateNo: z.string().max(40).optional().nullable(),
  operatingHours: z.number().nonnegative().optional().nullable(),
  idleHours: z.number().nonnegative().optional().nullable(),
  downHours: z.number().nonnegative().optional().nullable(),
  quantityLength: z.number().nonnegative().optional().nullable(),
  quantityWidth: z.number().nonnegative().optional().nullable(),
  quantityDepth: z.number().nonnegative().optional().nullable(),
  manpower: z.array(manpowerLineSchema).optional().nullable(),
  remark: z.string().max(1000).optional().nullable(),
});

/**
 * Structure Daily Report — primary form for Ovid multi-storey housing/building
 * (columns, slabs, beams, shear walls). Design vs Actual drives progress %.
 */
export const structureEntrySchema = z.object({
  projectId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  date: dateStringSchema,
  activityDescription: z.string().min(2).max(500),
  designQuantity: z.number().nonnegative().optional().nullable(),
  actualQuantity: z.number().nonnegative().optional().nullable(),
  materialUsed: z.string().max(200).optional().nullable(),
  concreteGrade: z
    .enum(["C-15", "C-20", "C-25", "C-30", "C-35", "C-40", "OTHER"])
    .optional()
    .nullable(),
  labour: z.array(manpowerLineSchema).optional().nullable(),
  equipmentType: z.string().max(80).optional().nullable(),
  equipmentSerialNo: z.string().max(40).optional().nullable(),
  operatingHours: z.number().nonnegative().optional().nullable(),
  idleHours: z.number().nonnegative().optional().nullable(),
  downHours: z.number().nonnegative().optional().nullable(),
  remark: z.string().max(1000).optional().nullable(),
});

/**
 * Rebar (Bar Schedule) Daily Report.
 * Weight auto-computed from WeightFactor lookup (no manual arithmetic).
 */
export const rebarEntrySchema = z.object({
  projectId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  date: dateStringSchema,
  barDesignation: z.string().min(1).max(40),
  diameterMm: z.number().int().positive(),
  numberOfBars: z.number().int().positive(),
  lengthM: z.number().positive(),
  numberOfFaces: z.number().int().positive().default(1),
  shape: z.string().max(80).optional().nullable(),
  labour: z.array(manpowerLineSchema).optional().nullable(),
  remark: z.string().max(1000).optional().nullable(),
});

export type EarthworkEntryInput = z.infer<typeof earthworkEntrySchema>;
export type StructureEntryInput = z.infer<typeof structureEntrySchema>;
export type RebarEntryInput = z.infer<typeof rebarEntrySchema>;
