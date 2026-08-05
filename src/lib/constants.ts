import { format as fnsFormat, parseISO, isValid } from "date-fns";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

export const PARTY_LABELS: Record<PartyType, string> = {
  CONTRACTOR: "Contractor",
  CLIENT: "Client",
  CONSULTANT: "Consultant",
  SUBCONTRACTOR: "Subcontractor",
  SUPPLIER: "Supplier",
  REGULATOR: "Regulator",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  FOREMAN: "Foreman",
  SUPERINTENDENT: "Superintendent",
  SITE_ENGINEER: "Site Engineer",
  DEPUTY_PM: "Deputy PM",
  SENIOR_PM: "Senior PM",
  QC_INSPECTOR: "QC Inspector",
  HSE_OFFICER: "HSE Officer",
  QS: "Quantity Surveyor",
  PROCUREMENT: "Procurement",
  FINANCE: "Finance",
  HR: "HR",
  EQUIPMENT_MANAGER: "Equipment Manager",
  CONTRACTS_LEGAL: "Contracts & Legal",
  CONSULTANT_ENGINEER: "Consultant Engineer",
  CLIENT_REP: "Client Rep",
  ADMIN: "Admin",
};

export const WORKSPACE_TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  wbs: "WBS",
  daily: "Daily Site Reports",
  schedule: "Schedule",
  cost: "Cost & Payments",
  risk: "Risk Register",
  safety: "Safety",
  quality: "Quality",
  resources: "Resources",
  engineering: "Engineering / Takeoff",
  documents: "Documents & Drawings",
  procurement: "Procurement",
  reports: "Reports / Compliance",
};

/**
 * Lucide icon *name* for each workspace tab.
 * Import icons lazily in the component — do NOT import here (server/client boundary).
 */
export const WORKSPACE_TAB_ICONS: Record<string, string> = {
  overview: "LayoutDashboard",
  wbs: "Network",
  daily: "ClipboardList",
  schedule: "CalendarDays",
  cost: "DollarSign",
  risk: "AlertTriangle",
  safety: "ShieldCheck",
  quality: "BadgeCheck",
  resources: "Users",
  engineering: "Ruler",
  documents: "FolderOpen",
  procurement: "ShoppingCart",
  reports: "FileBarChart2",
};

/** Groups for the project workspace sidebar. */
export const WORKSPACE_TAB_GROUPS: { label: string; tabs: string[] }[] = [
  { label: "Management", tabs: ["overview", "wbs", "daily", "schedule"] },
  { label: "Commercial", tabs: ["cost", "procurement"] },
  { label: "Control", tabs: ["risk", "safety", "quality"] },
  { label: "Technical", tabs: ["engineering", "resources"] },
  { label: "Output", tabs: ["documents", "reports"] },
];


function toDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isValid(date) ? date : null;
  const iso = parseISO(date);
  if (isValid(iso)) return iso;
  const fallback = new Date(date);
  return isValid(fallback) ? fallback : null;
}

export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return "—";
  return fnsFormat(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return "—";
  return fnsFormat(d, "dd MMM yyyy, HH:mm");
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
