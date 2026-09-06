import type {
  CompanyApprovalStatus,
  CompanyApprovalType,
  ExecutiveInterventionCategory,
  ExecutiveInterventionPriority,
  ExecutiveInterventionStatus,
} from "@/generated/prisma/enums";
import type { CompanyDashboardPayload, CompanyPortfolioProject } from "@/lib/types/company";

export type GeneralManagerApproval = {
  id: string;
  type: CompanyApprovalType;
  status: CompanyApprovalStatus;
  entityType: string;
  entityId: string;
  amount: string | number | null;
  comment: string | null;
  thresholdSnapshot: unknown;
  requestedAt: string;
  requestedBy: { id: string; fullName: string; jobTitle: string };
};

export type ExecutiveInterventionEventRow = {
  id: string;
  type: string;
  comment: string;
  oldStatus: ExecutiveInterventionStatus | null;
  newStatus: ExecutiveInterventionStatus | null;
  oldDueAt: string | null;
  newDueAt: string | null;
  createdAt: string;
  author: { fullName: string; jobTitle: string };
};

export type ExecutiveInterventionRow = {
  id: string;
  category: ExecutiveInterventionCategory;
  priority: ExecutiveInterventionPriority;
  status: ExecutiveInterventionStatus;
  title: string;
  description: string;
  requiredAction: string;
  sourceType: string | null;
  sourceId: string | null;
  dueAt: string;
  createdAt: string;
  closedAt: string | null;
  project: { id: string; code: string; name: string };
  accountableUser: { id: string; fullName: string; jobTitle: string };
  createdBy: { fullName: string };
  closedBy: { fullName: string } | null;
  events: ExecutiveInterventionEventRow[];
};

export type GeneralManagerDashboardPayload = {
  portfolio: CompanyDashboardPayload;
  approvals: GeneralManagerApproval[];
  interventions: ExecutiveInterventionRow[];
  safetyIncidents: Array<{ id: string; incidentType: string; description: string; status: string; createdAt: string; wbsNode: { project: { id: string; code: string; name: string } } }>;
  auditFindings: Array<{ id: string; title: string; description: string; severity: string; status: string; dueAt: string | null; project: { id: string; code: string; name: string } | null; owner: { fullName: string; jobTitle: string } | null; raisedBy: { fullName: string } }>;
  regulatoryReports: Array<{ id: string; reportType: string; generatedAt: string; filePath: string; project: { id: string; code: string; name: string } }>;
  reportExceptions: Array<{ id: string; code: string; name: string; issue: string }>;
  decisionHistory: Array<{ id: string; type: CompanyApprovalType; status: CompanyApprovalStatus; entityType: string; entityId: string; amount: string | number | null; comment: string | null; requestedAt: string; reviewedAt: string | null; requestedBy: { fullName: string } }>;
  managers: Array<{ id: string; fullName: string; jobTitle: string; role: string }>;
  stoppages: Array<{ id: string; stoppageType: string; reason: string; startTime: string; project: { id: string; code: string; name: string } }>;
  projectsRequiringAttention: CompanyPortfolioProject[];
  executiveMetrics: {
    pendingDecisions: number;
    openInterventions: number;
    overdueInterventions: number;
    criticalInterventions: number;
    projectsRequiringAttention: number;
    openSafetyIncidents: number;
    openAuditFindings: number;
    complianceExceptions: number;
    activeStoppages: number;
  };
};
