import { z } from "zod";

const roles = [
  "FOREMAN",
  "SUPERINTENDENT",
  "SITE_ENGINEER",
  "DEPUTY_PM",
  "SENIOR_PM",
  "QC_INSPECTOR",
  "HSE_OFFICER",
  "QS",
  "PROCUREMENT",
  "FINANCE",
  "HR",
  "EQUIPMENT_MANAGER",
  "CONTRACTS_LEGAL",
  "CONSULTANT_ENGINEER",
  "CLIENT_REP",
  "ADMIN",
] as const;

export const singleInviteSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  fullName: z.string().min(2).max(120),
  jobTitle: z.string().min(1).max(120).optional().default("Staff"),
  role: z.enum(roles),
  phone: z.string().max(40).optional().nullable(),
  /** Project-level role label stored on membership (defaults to role) */
  projectRole: z.string().max(80).optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export const bulkInviteSchema = z.object({
  projectId: z.string().optional().nullable(),
  invitations: z.array(singleInviteSchema).min(1).max(200),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(16).max(128),
  fullName: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
});

export type SingleInviteInput = z.infer<typeof singleInviteSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
