import { z } from "zod";

export const companyRoles = [
  "GENERAL_MANAGER", "LEGAL_SERVICE_MANAGER", "HEAD_TENDERING", "TENDERING_OFFICER",
  "HEAD_PLANNING_MONITORING", "PLANNING_OFFICER", "ENGINEERING_DEPT_MANAGER",
  "HEAD_ENGINEERING_SERVICES", "ENGINEERING_SERVICES_OFFICER", "EQUIPMENT_ADMIN_MANAGER",
  "FINANCE_DEPT_MANAGER", "INTERNAL_AUDITOR",
] as const;

export const companyStaffInviteSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  fullName: z.string().min(2).max(120),
  jobTitle: z.string().min(1).max(120),
  role: z.enum(companyRoles),
});

export const companyAssignmentSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(companyRoles),
  reason: z.string().max(500).optional(),
});

export type CompanyStaffInviteInput = z.infer<typeof companyStaffInviteSchema>;
export type CompanyAssignmentInput = z.infer<typeof companyAssignmentSchema>;
