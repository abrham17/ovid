import { z } from "zod";
import { dateStringSchema, moneySchema } from "./common";

export const createBoqItemSchema = z.object({
  wbsNodeId: z.string().cuid(),
  itemCode: z.string().min(1).max(50),
  description: z.string().min(2).max(500),
  unit: z.string().min(1).max(30),
  budgetedQuantity: z.number().nonnegative(),
  unitRate: z.number().nonnegative(),
});

export const createCostActualSchema = z.object({
  boqItemId: z.string().cuid(),
  costType: z.enum(["COMMITTED", "ACTUAL"]),
  amount: moneySchema,
  sourceType: z.enum([
    "PURCHASE_ORDER",
    "INVOICE",
    "PAYROLL",
    "EQUIPMENT_USAGE",
    "VARIATION_ORDER",
  ]),
  sourceId: z.string().min(1).max(100),
  recordedAt: dateStringSchema,
});

export const createMeasurementSchema = z.object({
  contractId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  itemNo: z.string().min(1).max(50),
  locationFrom: z.string().max(80).optional().nullable(),
  locationTo: z.string().max(80).optional().nullable(),
  side: z.string().max(40).optional().nullable(),
  length: z.number().nonnegative().optional().nullable(),
  width: z.number().nonnegative().optional().nullable(),
  depth: z.number().nonnegative().optional().nullable(),
  quantity: z.number().nonnegative(),
  unitRate: z.number().nonnegative(),
  certificateNo: z.string().max(80).optional().nullable(),
});

export const createVariationSchema = z.object({
  wbsNodeId: z.string().cuid().optional().nullable(),
  itemNo: z.string().min(1).max(50),
  workDescription: z.string().min(5).max(3000),
  equipmentUsed: z.any().optional().nullable(),
  manpowerUsed: z.any().optional().nullable(),
  materialUsed: z.any().optional().nullable(),
  costImpact: moneySchema.optional().nullable(),
  timeImpactDays: z.number().int().optional().nullable(),
});

export type CreateBoqItemInput = z.infer<typeof createBoqItemSchema>;
export type CreateCostActualInput = z.infer<typeof createCostActualSchema>;
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
export type CreateVariationInput = z.infer<typeof createVariationSchema>;
