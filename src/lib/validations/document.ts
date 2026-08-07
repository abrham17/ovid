import { z } from "zod";
import { dateStringSchema } from "./common";

export const createDocumentSchema = z.object({
  wbsNodeId: z.string().cuid().optional().nullable(),
  docNo: z.string().min(1).max(80),
  title: z.string().min(2).max(300),
  category: z.enum([
    "DRAWING",
    "SPECIFICATION",
    "CONTRACT",
    "CORRESPONDENCE",
    "PERMIT",
    "METHOD_STATEMENT",
    "REPORT",
    "OTHER",
  ]),
  revisionNo: z.number().int().positive().default(1),
  filePath: z.string().max(500).optional().nullable(),
  effectiveDate: dateStringSchema.optional().nullable(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
