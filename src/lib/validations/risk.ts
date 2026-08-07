import { z } from "zod";

export const createRiskSchema = z.object({
  wbsNodeId: z.string().cuid().optional().nullable(),
  category: z.enum([
    "DESIGN",
    "PROCUREMENT",
    "WEATHER",
    "FX_IMPORT",
    "GEOTECHNICAL",
    "REGULATORY",
    "LABOR",
    "SECURITY_THEFT",
    "FINANCIAL",
    "OTHER",
  ]),
  description: z.string().min(5).max(2000),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  ownerId: z.string().cuid(),
  mitigationPlan: z.string().max(3000).optional().nullable(),
});

export const updateRiskSchema = createRiskSchema.partial().extend({
  status: z.enum(["OPEN", "MITIGATING", "CLOSED", "REALIZED"]).optional(),
  realizedAsStoppageId: z.string().cuid().optional().nullable(),
  realizedAsVariationId: z.string().cuid().optional().nullable(),
});

export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;
