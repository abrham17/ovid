// components/bulk-invite/types.ts
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export type ImportMethod = "paste-emails" | "paste-spreadsheet" | "csv" | "excel" | "manual";

export type RowStatus = "ready" | "warning" | "error" | "duplicate" | "existing";

export type WizardStep =
  | "import"
  | "preview"
  | "validation"
  | "assignment"
  | "review"
  | "sending"
  | "results";

export interface OrgOption {
  id: string;
  name: string;
  partyType: PartyType;
}

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
  organizationId?: string;
}

export interface InviteRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  organizationId: string;
  projectId: string;
  department: string;
  jobTitle: string;
  role: UserRole;
  projectRole: string;
  notes: string;
  status: RowStatus;
  errors: string[];
  warnings: string[];
}

export interface BulkInviteFormProps {
  roles: UserRole[];
  organizations: OrgOption[];
  projects: ProjectOption[];
  isAdmin: boolean;
  defaultOrganizationId: string;
}

export interface ValidationIssue {
  field: keyof InviteRow | "row";
  message: string;
  severity: "error" | "warning";
}

export interface SendResult {
  email: string;
  fullName: string;
  success: boolean;
  code: "sent" | "already_registered" | "already_invited" | "failed" | "skipped";
  message: string;
}

export interface BulkActionsPayload {
  role?: UserRole;
  projectId?: string;
  organizationId?: string;
  department?: string;
  jobTitle?: string;
  projectRole?: string;
  phonePrefix?: string;
}

export interface SummaryStats {
  imported: number;
  ready: number;
  warnings: number;
  errors: number;
  duplicates: number;
  existing: number;
}

export type ColumnKey =
  | "status"
  | "fullName"
  | "email"
  | "phone"
  | "organizationId"
  | "projectId"
  | "department"
  | "jobTitle"
  | "role"
  | "projectRole"
  | "notes"
  | "errors"
  | "actions";