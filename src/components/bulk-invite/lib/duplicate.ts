// components/bulk-invite/lib/duplicate.ts
import type { InviteRow } from "../types";
import { normalizePhone } from "./validation";

export function findDuplicateEmails(rows: InviteRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const key = row.email.trim().toLowerCase();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(row.id);
    map.set(key, list);
  }
  return map;
}

export function findDuplicatePhones(rows: InviteRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.phone.trim()) continue;
    const key = normalizePhone(row.phone);
    const list = map.get(key) ?? [];
    list.push(row.id);
    map.set(key, list);
  }
  return map;
}

export function mergeDuplicateRows(rows: InviteRow[]): InviteRow[] {
  const seen = new Map<string, InviteRow>();
  const result: InviteRow[] = [];

  for (const row of rows) {
    const key = row.email.trim().toLowerCase();
    if (!key) {
      result.push(row);
      continue;
    }
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, row);
      result.push(row);
    } else {
      // Prefer non-empty values from the later row
      existing.fullName = existing.fullName || row.fullName;
      existing.phone = existing.phone || row.phone;
      existing.jobTitle = existing.jobTitle || row.jobTitle;
      existing.department = existing.department || row.department;
      existing.notes = existing.notes || row.notes;
      existing.projectId = existing.projectId || row.projectId;
      existing.projectRole = existing.projectRole || row.projectRole;
    }
  }
  return result;
}