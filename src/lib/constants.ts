import type { UserRole, PartyType, ProjectStatus, ActivityStatus } from "@/generated/prisma/enums";

export const APP_NAME = "Ovid PMS";
export const APP_TAGLINE = "Construction Project Management for Grade-1 Practice";

export const ROLE_LABELS: Record<UserRole, string> = {
  FOREMAN: "Foreman",
  SUPERINTENDENT: "Superintendent",
  SITE_ENGINEER: "Site Engineer",
  DEPUTY_PM: "Deputy Project Manager",
  SENIOR_PM: "Senior Project Manager",
  QC_INSPECTOR: "QC Inspector",
  HSE_OFFICER: "HSE Officer",
  QS: "Quantity Surveyor",
  PROCUREMENT: "Procurement",
  FINANCE: "Finance",
  HR: "Human Resources",
  EQUIPMENT_MANAGER: "Equipment Manager",
  CONTRACTS_LEGAL: "Contracts & Legal",
  CONSULTANT_ENGINEER: "Consultant Engineer",
  CLIENT_REP: "Client Representative",
  ADMIN: "Administrator",
  SUBCONTRACTOR_PM: "Subcontractor Manager",
  OFFICE_ENGINEER: "Office Engineer",
  COMPANY_STAFF: "Company Staff",
};

export const PARTY_LABELS: Record<PartyType, string> = {
  CONTRACTOR: "Contractor",
  CLIENT: "Client",
  CONSULTANT: "Consultant",
  SUBCONTRACTOR: "Subcontractor",
  SUPPLIER: "Supplier",
  REGULATOR: "Regulator",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  COMPLETE: "Complete",
  CLOSED: "Closed",
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
  ON_HOLD: "On Hold",
};

/** Currency formatter for Ethiopian Birr (ETB) primary, with USD fallback support */
export function formatCurrency(amount: number | null | undefined, currency: "ETB" | "USD" = "ETB") {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function titleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Workspace tabs used by project sidebar */
export type WorkspaceTab =
  | "overview"
  | "wbs"
  | "daily"
  | "schedule"
  | "cost"
  | "risk"
  | "safety"
  | "quality"
  | "resources"
  | "engineering"
  | "documents"
  | "procurement"
  | "reports"
  | "team"
  | "settings";

export const WORKSPACE_TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  wbs: "WBS",
  daily: "Daily Reports",
  schedule: "Schedule",
  cost: "Cost & BOQ",
  risk: "Risk",
  safety: "HSE / Safety",
  quality: "Quality",
  resources: "Labor & Equipment",
  engineering: "Engineering",
  documents: "Documents",
  procurement: "Procurement",
  reports: "Reports",
  team: "Team",
  settings: "Settings",
};

export const WORKSPACE_TAB_GROUPS: { label: string; tabs: WorkspaceTab[] }[] = [
  { label: "Management", tabs: ["overview", "wbs", "schedule", "team"] },
  { label: "Field", tabs: ["daily", "resources"] },
  { label: "Control", tabs: ["quality", "safety", "risk"] },
  { label: "Commercial", tabs: ["cost", "procurement"] },
  { label: "Technical", tabs: ["engineering", "documents"] },
  { label: "Output", tabs: ["reports", "settings"] },
];


/** Modules that appear in the project sidebar / navigation */
export const PROJECT_MODULES = [
  { id: "overview", label: "Overview", href: "", icon: "LayoutDashboard" },
  { id: "wbs", label: "WBS", href: "wbs", icon: "Network" },
  { id: "schedule", label: "Schedule", href: "schedule", icon: "Calendar" },
  { id: "daily", label: "Daily Reports", href: "daily", icon: "ClipboardList" },
  { id: "quality", label: "Quality", href: "quality", icon: "ShieldCheck" },
  { id: "safety", label: "HSE / Safety", href: "safety", icon: "HardHat" },
  { id: "cost", label: "Cost & BOQ", href: "cost", icon: "Calculator" },
  { id: "procurement", label: "Procurement", href: "procurement", icon: "Package" },
  { id: "resources", label: "Labor & Equipment", href: "resources", icon: "Users" },
  { id: "documents", label: "Documents", href: "documents", icon: "FileText" },
  { id: "risk", label: "Risk", href: "risk", icon: "AlertTriangle" },
  { id: "team", label: "Team", href: "team", icon: "UserPlus" },
  { id: "settings", label: "Settings", href: "settings", icon: "Settings" },
] as const;

export type ProjectModuleId = (typeof PROJECT_MODULES)[number]["id"];

/** Role → default landing module after login */
export const ROLE_DEFAULT_MODULE: Partial<Record<UserRole, ProjectModuleId>> = {
  FOREMAN: "daily",
  SUPERINTENDENT: "schedule",
  SITE_ENGINEER: "daily",
  QC_INSPECTOR: "quality",
  HSE_OFFICER: "safety",
  QS: "cost",
  PROCUREMENT: "procurement",
  FINANCE: "cost",
  HR: "resources",
  EQUIPMENT_MANAGER: "resources",
  CONTRACTS_LEGAL: "documents",
  SENIOR_PM: "overview",
  DEPUTY_PM: "overview",
  CONSULTANT_ENGINEER: "quality",
  CLIENT_REP: "overview",
  ADMIN: "overview",
  OFFICE_ENGINEER: "documents",
};
