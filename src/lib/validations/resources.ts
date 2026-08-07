import { z } from "zod";
import { dateStringSchema } from "./common";

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2).max(120),
  profession: z.string().min(2).max(80),
  employmentType: z.enum(["PERMANENT", "DAILY_CASUAL", "SUBCONTRACTOR_STAFF"]),
});

export const createAssignmentSchema = z.object({
  employeeId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  date: dateStringSchema,
  hoursOnTask: z.number().positive().max(24),
});

export const createAttendanceSchema = z.object({
  employeeId: z.string().cuid(),
  date: dateStringSchema,
  present: z.boolean(),
  hours: z.number().min(0).max(24),
});

export const createEquipmentSchema = z.object({
  equipmentType: z.string().min(2).max(80),
  plateNo: z.string().max(40).optional().nullable(),
  serialNo: z.string().max(80).optional().nullable(),
});

export const createUsageLogSchema = z.object({
  equipmentId: z.string().cuid(),
  wbsNodeId: z.string().cuid(),
  date: dateStringSchema,
  operatingHours: z.number().min(0).max(24),
  idleHours: z.number().min(0).max(24).default(0),
  downHours: z.number().min(0).max(24).default(0),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type CreateUsageLogInput = z.infer<typeof createUsageLogSchema>;
