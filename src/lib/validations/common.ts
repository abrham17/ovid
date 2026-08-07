import { z } from "zod";

export const idSchema = z.string().cuid();
export const optionalId = z.string().cuid().optional().nullable();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateStringSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" });

export const optionalDate = dateStringSchema.optional().nullable();

export const moneySchema = z.number().finite().nonnegative();

export const percentageSchema = z.number().min(0).max(100);
