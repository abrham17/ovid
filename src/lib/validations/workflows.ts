import { z } from "zod";
import { dateStringSchema } from "./common";

export const createContractSchema = z.object({
  contractorOrgId: z.string().cuid(),
  parentContractId: z.string().cuid().optional(),
  scopeWbsNodeId: z.string().cuid(),
  scopeDescription: z.string().min(3).max(500),
  contractValue: z.number().nonnegative(),
  retentionPercent: z.number().min(0).max(100).optional(),
});

export const createPlanSubmissionSchema = z.object({
  contractId: z.string().cuid(),
  title: z.string().min(3).max(200),
});

export const weightEntriesSchema = z.array(
  z.object({ id: z.string().cuid(), weightPercent: z.number().nonnegative() })
).min(1);

export const createOversightEntrySchema = z.object({
  contractId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  oversightAssignmentId: z.string().cuid(),
  date: dateStringSchema,
  activityDescription: z.string().min(3).max(500),
  observedQuantity: z.number().nonnegative().optional().nullable(),
  observedUnit: z.string().max(40).optional().nullable(),
  reportedQuantity: z.number().nonnegative().optional().nullable(),
  quantityAssessment: z.enum(["NOT_ASSESSED", "MATCHES_REPORTED", "BELOW_REPORTED", "ABOVE_REPORTED"]).optional(),
  qualityAssessment: z.string().max(1000).optional().nullable(),
  concernsRaised: z.string().max(2000).optional().nullable(),
  manpowerObserved: z.number().int().nonnegative().optional().nullable(),
});

export const createResourceRequestSchema = z.object({
  contractId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  kind: z.enum(["MATERIAL", "EQUIPMENT", "LABOR"]),
  materialItemId: z.string().cuid().optional().nullable(),
  equipmentId: z.string().cuid().optional().nullable(),
  description: z.string().min(3).max(500),
  quantity: z.number().positive(),
  unit: z.string().max(40).optional().nullable(),
  neededByDate: dateStringSchema,
  justification: z.string().min(3).max(2000),
}).superRefine((value, ctx) => {
  if (value.kind === "MATERIAL" && !value.materialItemId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["materialItemId"], message: "Material requests require a material item" });
  }
  if (value.kind === "EQUIPMENT" && !value.equipmentId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["equipmentId"], message: "Equipment requests require an equipment item" });
  }
});

export type CreateOversightEntryInput = z.infer<typeof createOversightEntrySchema>;
export type CreateResourceRequestInput = z.infer<typeof createResourceRequestSchema>;
