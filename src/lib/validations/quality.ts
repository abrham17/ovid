import { z } from "zod";
import { dateStringSchema } from "./common";

export const createItrSchema = z.object({
  wbsNodeId: z.string().cuid(),
  inspectionType: z.string().min(2).max(120),
  result: z.enum(["PASS", "FAIL", "CONDITIONAL_PASS"]),
  inspectedAt: dateStringSchema,
});

export const createDefectSchema = z.object({
  wbsNodeId: z.string().cuid(),
  linkedItrId: z.string().cuid().optional().nullable(),
  description: z.string().min(5).max(2000),
  responsibleOrgId: z.string().cuid().optional().nullable(),
  reworkDelayDays: z.number().int().nonnegative().optional().nullable(),
});

export const createPunchSchema = z.object({
  wbsNodeId: z.string().cuid(),
  description: z.string().min(3).max(1000),
  severity: z.enum(["MINOR", "MAJOR"]).default("MINOR"),
  patternTag: z.string().max(80).optional().nullable(),
});

export type CreateItrInput = z.infer<typeof createItrSchema>;
export type CreateDefectInput = z.infer<typeof createDefectSchema>;
export type CreatePunchInput = z.infer<typeof createPunchSchema>;
