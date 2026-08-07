import { z } from "zod";
import { dateStringSchema, moneySchema } from "./common";

export const createMaterialSchema = z.object({
  name: z.string().min(2).max(120),
  unit: z.string().min(1).max(30),
  importDependent: z.boolean().optional().default(false),
});

export const createPOSchema = z.object({
  supplierOrgId: z.string().cuid(),
  poNo: z.string().min(1).max(50),
  expectedDelivery: dateStringSchema.optional().nullable(),
  amount: moneySchema.optional().nullable(),
  items: z
    .array(
      z.object({
        materialItemId: z.string().cuid(),
        quantityOrdered: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        wbsNodeId: z.string().cuid().optional().nullable(),
      })
    )
    .optional()
    .default([]),
});

export const createBidSchema = z.object({
  supplierOrgId: z.string().cuid().optional().nullable(),
  bidNo: z.string().min(1).max(50),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  amount: moneySchema.optional().nullable(),
});

export const createReceiptSchema = z.object({
  purchaseOrderId: z.string().cuid(),
  materialItemId: z.string().cuid(),
  quantityReceived: z.number().positive(),
  receiptDate: dateStringSchema,
  wbsNodeId: z.string().cuid().optional().nullable(),
  remark: z.string().max(500).optional().nullable(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type CreatePOInput = z.infer<typeof createPOSchema>;
export type CreateBidInput = z.infer<typeof createBidSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
