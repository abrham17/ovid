// components/bulk-invite/lib/import-csv.ts
import Papa from "papaparse";
import type { InviteRow } from "../types";
import type { UserRole } from "@/generated/prisma/enums";
import { deriveNameFromEmail } from "./validation";

const HEADER_MAP: Record<string, keyof InviteRow> = {
  email: "email",
  "e-mail": "email",
  "email address": "email",
  name: "fullName",
  "full name": "fullName",
  "full_name": "fullName",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  "job title": "jobTitle",
  jobtitle: "jobTitle",
  title: "jobTitle",
  role: "role",
  department: "department",
  dept: "department",
  notes: "notes",
  note: "notes",
  "project role": "projectRole",
  projectrole: "projectRole",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]/g, " ");
}

function createEmptyRow(defaults: Partial<InviteRow>): InviteRow {
  return {
    id: crypto.randomUUID(),
    fullName: "",
    email: "",
    phone: "",
    organizationId: defaults.organizationId ?? "",
    projectId: defaults.projectId ?? "",
    department: "",
    jobTitle: defaults.jobTitle ?? "",
    role: (defaults.role as UserRole) ?? "FOREMAN",
    projectRole: "",
    notes: "",
    status: "ready",
    errors: [],
    warnings: [],
  };
}

export function parseCsvText(
  text: string,
  defaults: Partial<InviteRow>
): { rows: InviteRow[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => normalizeHeader(h),
  });

  const parseErrors = result.errors.map((e) => e.message);
  const rows: InviteRow[] = [];

  if (result.meta.fields && result.meta.fields.length > 0) {
    for (const record of result.data) {
      const row = createEmptyRow(defaults);
      for (const [rawKey, value] of Object.entries(record)) {
        const mapped = HEADER_MAP[rawKey];
        if (!mapped || value == null) continue;
        const str = String(value).trim();
        if (mapped === "role") {
          row.role = str.toUpperCase() as UserRole;
        } else {
          (row as unknown as Record<string, unknown>)[mapped] = str;
        }
      }
      if (!row.fullName && row.email) {
        row.fullName = deriveNameFromEmail(row.email);
      }
      if (row.email || row.fullName) {
        rows.push(row);
      }
    }
  } else {
    // Fallback: treat as list of emails
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const email = line.includes(",") ? line.split(",")[0].trim() : line;
      if (!email) continue;
      const row = createEmptyRow(defaults);
      row.email = email;
      row.fullName = deriveNameFromEmail(email);
      rows.push(row);
    }
  }

  return { rows, errors: parseErrors };
}

export async function parseCsvFile(
  file: File,
  defaults: Partial<InviteRow>
): Promise<{ rows: InviteRow[]; errors: string[] }> {
  const text = await file.text();
  return parseCsvText(text, defaults);
}