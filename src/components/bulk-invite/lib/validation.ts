// components/bulk-invite/lib/validation.ts
import type { UserRole } from "@/generated/prisma/enums";
import type { InviteRow, OrgOption, ProjectOption, ValidationIssue } from "../types";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true;
  return PHONE_REGEX.test(phone.trim());
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("251") && !cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }
  return cleaned;
}

export function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local) return "";
  return local
    .replace(/[._+-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function validateRow(
  row: InviteRow,
  organizations: OrgOption[],
  projects: ProjectOption[],
  roles: UserRole[],
  emailIndex: Map<string, string[]>,
  phoneIndex: Map<string, string[]>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!row.fullName.trim() || row.fullName.trim().length < 2) {
    issues.push({ field: "fullName", message: "Full name is required (min 2 characters)", severity: "error" });
  }

  if (!row.email.trim()) {
    issues.push({ field: "email", message: "Email is required", severity: "error" });
  } else if (!isValidEmail(row.email)) {
    issues.push({ field: "email", message: "Invalid email format", severity: "error" });
  } else {
    const emailKey = row.email.trim().toLowerCase();
    const ids = emailIndex.get(emailKey) ?? [];
    if (ids.length > 1) {
      issues.push({ field: "email", message: "Duplicate email in this batch", severity: "error" });
    }
  }

  if (row.phone && !isValidPhone(row.phone)) {
    issues.push({ field: "phone", message: "Invalid phone format", severity: "warning" });
  } else if (row.phone.trim()) {
    const phoneKey = normalizePhone(row.phone);
    const ids = phoneIndex.get(phoneKey) ?? [];
    if (ids.length > 1) {
      issues.push({ field: "phone", message: "Duplicate phone in this batch", severity: "warning" });
    }
  }

  if (!row.jobTitle.trim()) {
    issues.push({ field: "jobTitle", message: "Job title is required", severity: "error" });
  }

  if (!row.role || !roles.includes(row.role)) {
    issues.push({ field: "role", message: "Valid role is required", severity: "error" });
  }

  if (!row.organizationId) {
    issues.push({ field: "organizationId", message: "Organization is required", severity: "error" });
  } else if (!organizations.some((o) => o.id === row.organizationId)) {
    issues.push({ field: "organizationId", message: "Organization not found", severity: "error" });
  }

  if (row.projectId) {
    const project = projects.find((p) => p.id === row.projectId);
    if (!project) {
      issues.push({ field: "projectId", message: "Project not found", severity: "error" });
    } else if (project.organizationId && project.organizationId !== row.organizationId) {
      issues.push({
        field: "projectId",
        message: "Project does not belong to selected organization",
        severity: "warning",
      });
    }
  }

  if (row.email && isValidEmail(row.email)) {
    const domain = row.email.split("@")[1]?.toLowerCase() ?? "";
    if (["tempmail.com", "mailinator.com", "guerrillamail.com", "10minutemail.com"].includes(domain)) {
      issues.push({ field: "email", message: "Disposable email detected", severity: "warning" });
    }
  }

  return issues;
}

export function applyValidation(
  rows: InviteRow[],
  organizations: OrgOption[],
  projects: ProjectOption[],
  roles: UserRole[]
): InviteRow[] {
  const emailIndex = new Map<string, string[]>();
  const phoneIndex = new Map<string, string[]>();

  for (const row of rows) {
    const emailKey = row.email.trim().toLowerCase();
    if (emailKey) {
      const list = emailIndex.get(emailKey) ?? [];
      list.push(row.id);
      emailIndex.set(emailKey, list);
    }
    if (row.phone.trim()) {
      const phoneKey = normalizePhone(row.phone);
      const list = phoneIndex.get(phoneKey) ?? [];
      list.push(row.id);
      phoneIndex.set(phoneKey, list);
    }
  }

  return rows.map((row) => {
    const issues = validateRow(row, organizations, projects, roles, emailIndex, phoneIndex);
    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);

    let status: InviteRow["status"] = "ready";
    if (errors.length > 0) status = "error";
    else if (warnings.some((w) => w.includes("Duplicate"))) status = "duplicate";
    else if (warnings.length > 0) status = "warning";

    return {
      ...row,
      errors,
      warnings,
      status,
    };
  });
}