import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email required").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(120),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
