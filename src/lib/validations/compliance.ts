import { z } from "zod";

export const createRegulatoryReportSchema = z.object({
  projectId: z.string().cuid(),
  reportType: z.enum([
    "GRADING_RENEWAL",
    "PROGRESS_SUBMISSION",
    "SAFETY_COMPLIANCE",
    "OTHER",
  ]),
  filePath: z.string().min(1).max(500),
});

export const createDecisionSchema = z.object({
  wbsNodeId: z.string().cuid().optional().nullable(),
  documentId: z.string().cuid().optional().nullable(),
  riskId: z.string().cuid().optional().nullable(),
  variationId: z.string().cuid().optional().nullable(),
  decisionType: z.enum([
    "DESIGN_CHANGE",
    "DELAY_RULING",
    "VARIATION_APPROVAL",
    "RESOURCE_ALLOCATION",
    "SAFETY_STOPPAGE",
    "OTHER",
  ]),
  decision: z.string().min(3).max(2000),
  rationale: z.string().max(3000).optional().nullable(),
});

export const createLessonSchema = z.object({
  wbsNodeId: z.string().cuid().optional().nullable(),
  phase: z.string().max(80).optional().nullable(),
  category: z.string().min(2).max(80),
  lesson: z.string().min(5).max(3000),
  recommendation: z.string().max(2000).optional().nullable(),
});

export type CreateRegulatoryReportInput = z.infer<typeof createRegulatoryReportSchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
