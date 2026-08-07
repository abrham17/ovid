// components/bulk-invite/lib/utils.ts
import type { InviteRow, SummaryStats } from "../types";

export function createEmptyInviteRow(defaults: Partial<InviteRow> = {}): InviteRow {
  return {
    id: crypto.randomUUID(),
    fullName: defaults.fullName ?? "",
    email: defaults.email ?? "",
    phone: defaults.phone ?? "",
    organizationId: defaults.organizationId ?? "",
    projectId: defaults.projectId ?? "",
    department: defaults.department ?? "",
    jobTitle: defaults.jobTitle ?? "",
    role: defaults.role ?? "FOREMAN",
    projectRole: defaults.projectRole ?? "",
    notes: defaults.notes ?? "",
    status: "ready",
    errors: [],
    warnings: [],
  };
}

export function computeSummary(rows: InviteRow[]): SummaryStats {
  return {
    imported: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    warnings: rows.filter((r) => r.status === "warning").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    existing: rows.filter((r) => r.status === "existing").length,
  };
}

export function downloadCsv(filename: string, rows: Record<string, string | number | boolean>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}