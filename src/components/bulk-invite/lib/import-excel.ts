// components/bulk-invite/lib/import-excel.ts
import * as XLSX from "xlsx";
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
  return String(h).trim().toLowerCase().replace(/[_-]/g, " ");
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

export async function parseExcelFile(
  file: File,
  defaults: Partial<InviteRow>
): Promise<{ rows: InviteRow[]; errors: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ["Workbook contains no sheets"] };
  }

  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows: InviteRow[] = [];
  const errors: string[] = [];

  for (const record of json) {
    const row = createEmptyRow(defaults);
    for (const [rawKey, value] of Object.entries(record)) {
      const mapped = HEADER_MAP[normalizeHeader(rawKey)];
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

  if (rows.length === 0) {
    errors.push("No usable rows found in the spreadsheet");
  }

  return { rows, errors };
}