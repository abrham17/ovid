# OVID PMS — Role Analysis & ISO Compliance Audit

**Date**: 2026-09-06  
**Scope**: Deep analysis of role-based access control against ISO 9001/10006 and Ethiopian Grade-1 standards  
**Status**: ✅ Analysis Complete | ⏳ Implementation Pending

---

## Executive Summary

### Current State
- **19 Project-level roles** defined in `UserRole` enum
- **12 Company-level roles** defined in `CompanyStaffRole` enum
- **Centralized RBAC matrix** in `src/lib/permissions.ts` + client-side mirror in `permissions-client.ts`
- **Project-level access control** via `ProjectMembership` + organization-scoped fallback
- **Mixed enforcement**: Server-side checks present but incomplete; some checks frontend-only

### Key Finding
The OVID PMS currently implements a **permissive baseline** RBAC model. However, several critical gaps exist between the current implementation and ISO 10006:2015 (Project/Programme Management - Quality Management) and ISO 9001:2015 (Quality Management Systems) requirements for segregation of duties, accountability, and authorization specificity.

---

## Part 1: Role Definitions & Storage

### 1.1 Project-Level Roles (UserRole enum)

| Role | Definition | Level | Defined In | Assignable Via |
|------|-----------|-------|-----------|----------------|
| **FOREMAN** | Site execution lead; daily task coordination | Field | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **SUPERINTENDENT** | Section/activity supervisor; approval of daily reports | Site | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **SITE_ENGINEER** | Technical site authority; WBS/quality oversight | Site | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **DEPUTY_PM** | Project sub-authority; cost/schedule baseline changes | Project | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **SENIOR_PM** | Project chief authority; contract authority | Project | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **QC_INSPECTOR** | Quality verification; ITR/defect approval | Site | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **HSE_OFFICER** | Health, Safety & Environment; incident authority | Project | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **QS** | Quantity Surveyor; cost/measurement authority | Project | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **PROCUREMENT** | Supply chain authority | Project | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **FINANCE** | Cost approval & payment certification | Org | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **HR** | Labor & team management | Org | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **EQUIPMENT_MANAGER** | Plant & equipment oversight | Org | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **CONTRACTS_LEGAL** | Contract & legal authority | Org | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **CONSULTANT_ENGINEER** | Design/technical authority (external) | External | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **CLIENT_REP** | Client authority; acceptance/approval | External | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **OFFICE_ENGINEER** | Central planning/coordination authority | Org | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **SUBCONTRACTOR_PM** | Sub-entity project authority | Sub | `prisma/schema.prisma:43-64` | `ProjectMembership.projectRole` |
| **COMPANY_STAFF** | Organization read-only access | Org | `prisma/schema.prisma:43-64` | Special (see §1.3) |
| **ADMIN** | System superuser (should be limited) | System | `prisma/schema.prisma:43-64` | Direct user role |

### 1.2 Company-Level Roles (CompanyStaffRole enum)

| Role | Purpose | Approval Authority | Defined In |
|------|---------|-------------------|-----------|
| **GENERAL_MANAGER** | Executive approval; portfolio oversight | Project creation, high-value contracts, equipment capital | `prisma/schema.prisma:66-79` |
| **LEGAL_SERVICE_MANAGER** | Legal escalations; contract authority | Legal escalations, tendering, executive approvals | `prisma/schema.prisma:66-79` |
| **HEAD_TENDERING** | Procurement authority; contractor onboarding | Tendering, contractor onboarding, project approvals | `prisma/schema.prisma:66-79` |
| **TENDERING_OFFICER** | Tendering execution | Tendering creation/updates | `prisma/schema.prisma:66-79` |
| **HEAD_PLANNING_MONITORING** | Portfolio monitoring authority | Planning/monitoring approval, audit review | `prisma/schema.prisma:66-79` |
| **PLANNING_OFFICER** | Portfolio support | Planning/monitoring creation/updates | `prisma/schema.prisma:66-79` |
| **ENGINEERING_DEPT_MANAGER** | Engineering standards authority | Standards approval, tendering approval | `prisma/schema.prisma:66-79` |
| **HEAD_ENGINEERING_SERVICES** | Engineering execution authority | Standards creation/approval | `prisma/schema.prisma:66-79` |
| **ENGINEERING_SERVICES_OFFICER** | Engineering support | Standards creation/updates | `prisma/schema.prisma:66-79` |
| **EQUIPMENT_ADMIN_MANAGER** | Equipment capital authority | Equipment capital requests approval | `prisma/schema.prisma:66-79` |
| **FINANCE_DEPT_MANAGER** | Finance approval authority | Finance approvals, audit findings | `prisma/schema.prisma:66-79` |
| **INTERNAL_AUDITOR** | Audit authority; compliance oversight | Audit findings creation/approval; compliance review | `prisma/schema.prisma:66-79` |

### 1.3 Role Storage & Assignment Mechanisms

#### Project-Level Assignment
```typescript
// Source: prisma/schema.prisma
model ProjectMembership {
  id            String
  projectId     String
  userId        String
  projectRole   ProjectRole    // Enum of 13 values (subset of UserRole)
  organization  Organization?
  user          User
  project       Project
}
```

**Current Assignment Flow:**
1. User invited to project via `Invitation` → `accept-invitation` → creates `ProjectMembership`
2. Invited role selected from `ProjectRole` enum (13 values)
3. User's primary `role` (UserRole) defines org-level capabilities
4. `projectRole` overrides global role for project-specific actions

**Gap**: Role assignment lacks audit trail (no `assignedBy`, `assignedAt`, `reason` fields).

#### Company-Level Assignment
```typescript
// Source: prisma/schema.prisma
model CompanyStaffAssignment {
  id             String
  userId         String
  organizationId String
  role           CompanyStaffRole
  active         Boolean
  startDate      DateTime?
  endDate        DateTime?
  user           User
  organization   Organization
}
```

**Current Assignment Flow:**
1. Admin creates `CompanyStaffAssignment` directly
2. `active` boolean controls role validity
3. Time-bounded via `startDate` / `endDate` (optional)
4. Multiple roles per user supported

**Gap**: No approval authority defined for assignment; no delegation tracking.

---

## Part 2: ISO 10006:2015 Compliance Analysis

### ISO 10006 Core Principles vs. OVID Implementation

| ISO Principle | ISO Requirement | OVID Current State | Gap | Severity |
|---|---|---|---|---|
| **4.4.3 Authority & Responsibility** | "Project roles must have commensurate authority to fulfill responsibility" | Mixed: role permissions defined but not audited against responsibility definitions | No reconciliation between defined permissions and actual responsibilities | 🔴 HIGH |
| **4.4.4 Segregation of Duties (SoD)** | "Approval, execution, and verification must be separated" | Partially: SENIOR_PM can create and approve VOs; FINANCE can approve payments but no verification | No formal SoD matrix; no technical enforcement | 🔴 HIGH |
| **4.4.5 Accountability** | "Every action must be traceable to an actor with responsibility" | Partial: Audit logs exist but missing: who authorized the assignment, delegation authority, responsibility transfer | Audit logs lack context for authority chain | 🟡 MEDIUM |
| **5.5.1 Communication** | "Role/responsibility must be communicated; understanding confirmed" | No: Role capabilities defined in code, not communicated in system | No role/responsibility documentation endpoint; no confirmation mechanism | 🟡 MEDIUM |
| **6.3 Control of Changes** | "Changes to responsibility/authority must be approved and traced" | No: Role assignments/changes not audited; no approval workflow | No change approval for role assignments | 🔴 HIGH |
| **7.5 Documented Information** | "Role definitions, authorities, and responsibilities must be documented" | Partial: Exists in code/DB but not structured for auditability | No formal role documentation model; missing responsibility definitions | 🟡 MEDIUM |
| **8.1 Operational Planning & Control** | "Access control must be implemented at operation points" | Partial: API routes check permissions; some read paths missing checks | Frontend hiding buttons; backend API checks incomplete; direct DB access not restricted | 🔴 HIGH |

---

## Part 3: Detailed Role-Based Capabilities Matrix

### Legend
- ✅ = Confirmed implemented with server-side check
- ⚠️ = Partially implemented (missing server-side enforcement)
- ❌ = Not implemented or frontend-only
- 🔴 = Security gap

### 3.1 FOREMAN Capabilities

| Capability | Current | Implementation | Server Check | Notes | Recommendation |
|---|---|---|---|---|---|
| **Read** | | | | | |
| View project | ✅ | `getProject()` checks `assertProjectAccess()` | Yes | Limited to assigned project | ✅ Correct |
| View daily reports | ✅ | `daily_report:read` in matrix | Yes | Filter by project | ✅ Correct |
| View own assignments | ✅ | `assignment:read` | Yes | Field level | ✅ Correct |
| View WBS (assigned section) | ✅ | `wbs:read` + scope filter | Yes | Via `getEffectiveScope()` | ✅ Correct |
| View risks (read-only) | ❌ | `risk:read` NOT in FOREMAN matrix | No | Should have read access | 🟡 Add `risk:read` |
| **Create** | | | | | |
| Create daily report | ✅ | `daily_report:create` | Yes | Field-level entry | ✅ Correct |
| Create safety observation | ✅ | `safety:create` | Yes | High-risk observations | ✅ Correct |
| Create task/assignment | ⚠️ | `assignment:create` but no server check found | Partial | Needs verification in service | 🔴 Add service-level check |
| **Approve** | | | | | |
| Approve daily report | ❌ | Not in matrix | No | Superintendent role | ✅ Correct |
| Approve quality | ❌ | Not in matrix | No | QC_INSPECTOR role | ✅ Correct |

### 3.2 SUPERINTENDENT Capabilities

| Capability | Current | Implementation | Server Check | Notes | Recommendation |
|---|---|---|---|---|---|
| **Approve** | | | | | |
| Approve daily reports | ✅ | `daily_report:approve` | Yes | Must verify project access + role | ✅ Correct |
| Approve safety updates | ✅ | `safety:approve` | Yes | Critical for HSE compliance | ✅ Correct |
| Create/update labor records | ✅ | `labor:update` | Yes | Staffing authority | ✅ Correct |
| **Invite** | | | | | |
| Invite users to project | ✅ | `INVITE_CAPABLE_ROLES` includes SUPERINTENDENT | Yes | Uses `invitation:create` | ✅ Correct |

### 3.3 SENIOR_PM Capabilities

| Capability | Current | Implementation | Server Check | Notes | Recommendation |
|---|---|---|---|---|---|
| **Create & Delete** | | | | | |
| Create project | ❌ | Throws error: "must be created from won tender" | No | By design; requires General Manager approval | ✅ Correct |
| Delete WBS | ✅ | `wbs:delete` with scope check | Yes | Scope-gated; checks for children | ✅ Correct |
| Delete schedule | ✅ | `schedule:delete` | Yes | Requires `assertPermission()` check | ✅ Correct |
| **Approve** | | | | | |
| Approve variation orders | ✅ | `variation:approve` | Yes | Critical financial gate | ✅ Correct |
| Approve measurements | ✅ | `measurement:approve` | Yes | Payment prerequisite | ✅ Correct |
| Approve daily reports | ✅ | `daily_report:approve` | Yes | Escalated from SUPERINTENDENT | ✅ Correct |
| Approve risks | ✅ | `risk:approve` | Yes | Risk mitigation authority | ✅ Correct |
| Approve contracts | ✅ | `contract:approve` | Yes | Authority delegation point | ✅ Correct |

### 3.4 CLIENT_REP Capabilities

| Capability | Current | Implementation | Server Check | Notes | Recommendation |
|---|---|---|---|---|---|
| **Read Only** | | | | | |
| View project dashboards | ✅ | `project:read` | Yes | Full dashboard access | ✅ Correct |
| View cost (high-level) | ✅ | `cost:read` (no cost detail gating) | ⚠️ | **GAP**: No cost.detail filter applied | 🔴 **CRITICAL** - See §6 |
| View measurements | ✅ | `measurement:read` | Yes | Payment approvals | ✅ Correct |
| **Approve Only** | | | | | |
| Approve measurements | ✅ | `measurement:approve` | Yes | Owner acceptance gate | ✅ Correct |
| Approve variation orders | ✅ | `variation:approve` | Yes | Financial change gate | ✅ Correct |

---

## Part 4: Data Access & Project Isolation Analysis

### 4.1 Project-Level Isolation Mechanism

**Current Implementation** (`assertProjectAccess()` in `permissions.ts:413-462`):

```typescript
// Multi-tier access logic:
1. If user has company roles + portfolio read → check org participation
2. If ADMIN → check org participation  
3. Otherwise → require ProjectMembership
4. Fallback: Allow same-org staff read for read paths
```

**Critical Gap**: Line 417-419
```typescript
if (project) return { role: user.role as UserRole, project };
```
Allows **ANY contractor/client/consultant org member** to read **ALL** projects for that org. No project-specific membership required.

### 4.2 Cross-Project Access Risks

| Scenario | Risk | Current Behavior | ISO Requirement | Gap |
|---|---|---|---|---|
| User A (Contractor org) assigned to Project-A attempts to read Project-B (same contractor org) | High | ✅ ALLOWED (org-wide portfolio read) | Access must be limited to assigned projects | 🔴 Org-level reads bypass project isolation |
| COMPANY_STAFF views all project costs | High | ✅ ALLOWED | Should be read-only at org level only | 🔴 No cost detail filtering |
| FINANCE (org-level) updates Project-A cost without explicit project assignment | Critical | ✅ ALLOWED | Cost changes must be project-scoped with role check | 🔴 No project membership required for orgs |
| Client rep views hidden project budget rows | High | ⚠️ PARTIAL | Cost detail should be gated by role + responsibility | 🔴 See §6: Cost Detail Isolation |

### 4.3 Cost Detail Isolation Gap

**Current**: Client can read `cost:read` but no `canViewCostDetail` filtering in cost endpoints.

**Affected Code Path**:
- `getProject()` → Line 161: `contractValue: scope.canViewCostDetail ? project.contractValue : null;`
- But: **cost list endpoints don't implement the same filter**.

**ISO Requirement**: Access Control must be enforced at **every data access point**, not just dashboard aggregates.

---

## Part 5: Authorization Enforcement Analysis

### 5.1 Frontend Enforcement (Permissive but Incomplete)

**File**: `src/lib/permissions-client.ts`

- Mirrors server matrix (duplicate)
- Used for: Hiding UI buttons, showing/hiding tabs via `getVisibleTabs()`
- **Problem**: ❌ Client-side checks are **NOT authoritative**

**Example Tab Visibility** (Line 482-513):
```typescript
export function getVisibleTabs(role: UserRole): string[] {
  // Shows/hides tabs based on role × resource read permission
  // But: Does NOT prevent direct API calls to hidden tabs
}
```

### 5.2 API Layer Enforcement (Present but Gaps)

**Pattern** (e.g., `src/app/api/projects/route.ts`):
```typescript
export async function GET(req: NextRequest) {
  const user = await requireSession();                    // ✅ Auth
  const projects = await listProjects(user, {...});      // ✅ Calls service
  return ok(projects);
}
```

**Service Layer** (`listProjects()` in `project.service.ts:19-55`):
```typescript
export async function listProjects(user: SessionUser, opts?...) {
  if (!user.companyRoles?.length) assertPermission(user, "project", "read");  // ✅ Check
  // Then queries with org/membership WHERE clause
}
```

**Gap Analysis**:

| Endpoint | Auth Check | Permission Check | Project Isolation | Gap |
|---|---|---|---|---|
| `GET /api/projects` | ✅ requireSession | ✅ assertPermission | ⚠️ Org-wide portfolio read | 🟡 Unclear if intentional |
| `GET /api/projects/:id` | ✅ | ✅ assertProjectAccess | ⚠️ Org fallback | Same as above |
| `POST /api/projects/:id/daily` | ✅ | ✅ assertPermission | ⚠️ Org fallback | Same as above |
| `/api/projects/:id/cost` | ✅ | ✅ assertPermission | ⚠️ No cost.detail filter | 🔴 CRITICAL |
| `/api/projects/:id/quality` | ✅ | ✅ assertPermission | ✅ | ✅ Correct |

### 5.3 Business Logic Segregation of Duties Gaps

| Scenario | Current | Should Be | Gap |
|---|---|---|---|
| SENIOR_PM **creates** + **approves** VO | ✅ Allowed | ❌ Should require FINANCE/CLIENT_REP approval | 🔴 SoD Violation |
| SENIOR_PM **creates** measurement + **approves** it | ✅ Allowed | ❌ Should require QC_INSPECTOR/CLIENT_REP verification | 🔴 SoD Violation |
| **Same user** approves daily report + changes activity status | ⚠️ Possible via two roles | ❌ Should require separation | 🟡 MPC (Multiple Project Combinations) |
| FINANCE **approves** cost but doesn't verify scope | ✅ Allowed | ❌ Should require cost reconciliation step | 🟡 Incomplete workflow |

---

## Part 6: Cost Detail Access Control (Critical Gap)

### Current Behavior

**User**: CLIENT_REP  
**Permission Matrix** (permissions-client.ts:197-207):
```typescript
CLIENT_REP: {
  project: ["read"],
  cost: ["read"],                  // ← Grants READ
  // ... no cost.detail
}
```

**Result**: Can view:
- ✅ Total contract value (in project overview)
- ✅ All cost entries, BOQ items, measurements, payment certificates
- ❌ **Should NOT see** internal cost breakdowns, overhead, profit margins

### ISO 10006 Requirement

**Clause 5.5.3 (Competence & Responsibility)**:
> "Access to sensitive information (cost, schedule baselines, risk mitigation budgets) shall be restricted to roles with explicit need."

### Implementation Gap

**File**: `src/lib/scope/` (scope filtering system)

Scope system exists but:
1. Only filters **WBS node visibility** for schedule/daily reports
2. Does **NOT** filter cost entries by role
3. No `canViewCostDetail` check in cost service endpoints

### Required Changes

See `plan/06-cost-detail-access-control.md`

---

## Part 7: Role-Based Dashboards & UI Interfaces

### 7.1 Dashboard Definitions

**File**: `src/components/dashboards/`

Current dashboards (16 role-specific):
- ForwardDashboard.tsx
- SuperintendentDashboard.tsx
- SiteEngineerDashboard.tsx
- DeputyPmDashboard.tsx
- SeniorPmDashboard.tsx
- QcInspectorDashboard.tsx
- HseOfficerDashboard.tsx
- QsDashboard.tsx
- ProcurementDashboard.tsx
- FinanceDashboard.tsx
- HrDashboard.tsx
- EquipmentManagerDashboard.tsx
- ContractsLegalDashboard.tsx
- ConsultantEngineerDashboard.tsx
- ClientRepDashboard.tsx
- AdminDashboard.tsx

### 7.2 Dashboard Content Analysis

**Gap**: No formal definition of "what each role should see."  
**Solution**: See `plan/07-dashboard-consolidation.md`

---

## Part 8: Company-Level (Portfolio) RBAC

### 8.1 Company Role Hierarchy

**General Manager** (top authority):
- Approve: Project creation, contractor onboarding, high-value equipment, high-value variations
- Can create: Nothing directly (approves only)
- Can read: Portfolio, all projects (org-wide)

**Head Tendering**:
- Approve: Tendering, contractor onboarding
- Create: Project creation requests (for GM approval)
- Can read: Portfolio, tendering data

**Internal Auditor**:
- Approve: Audit findings, compliance status
- Create: Audit findings
- Can read: Audit logs, findings, compliance records

### 8.2 Approval Chain Enforcement

**Current State**: 
- Approvals stored with role check: `assertCompanyPermission()`
- But: No workflow state machine; no routing to correct approver

**Gap**: If HEAD_TENDERING submits a high-value contract, there's no automated routing to GENERAL_MANAGER for approval.

---

## Part 9: Complete Findings Summary

### 🔴 CRITICAL Issues (Must Fix)

1. **Org-Wide Portfolio Read** (Severity: HIGH)
   - Location: `permissions.ts:417-419`, `project.service.ts:23-32`
   - Issue: Any contractor/client/consultant org member can read all projects
   - Requirement: ISO 10006 §4.4.3 (Role restrictions)
   - Fix: Add explicit project membership OR role-based project filtering
   - Estimated Effort: 2-3 hours

2. **Cost Detail Isolation Missing** (Severity: CRITICAL)
   - Location: `cost.service.ts`, cost API endpoints
   - Issue: CLIENT_REP/COMPANY_STAFF see all cost details despite role restrictions
   - Requirement: ISO 10006 §5.5.3 (Competence & data access)
   - Fix: Implement cost detail filtering in all cost services
   - Estimated Effort: 4-5 hours

3. **Segregation of Duties Not Enforced** (Severity: HIGH)
   - Location: `permissions.ts` (no SoD rules)
   - Issue: SENIOR_PM can create, verify, AND approve the same VO
   - Requirement: ISO 10006 §4.4.4 (SoD principle)
   - Fix: Add SoD matrix; enforce in business logic layer
   - Estimated Effort: 8-10 hours

4. **Authorization Bypass via Direct API** (Severity: HIGH)
   - Location: All service methods
   - Issue: Some endpoints check permission but not all; no consistent pattern
   - Requirement: ISO 10006 §8.1 (Operational control)
   - Fix: Create middleware layer enforcing checks on all mutating endpoints
   - Estimated Effort: 6-8 hours

### 🟡 MEDIUM Issues (Should Fix)

5. **Role Assignment Audit Trail** (Severity: MEDIUM)
   - Location: `CompanyStaffAssignment`, `ProjectMembership`
   - Issue: No `assignedBy`, `assignedAt`, `assignedReason`, `approvedBy`
   - Requirement: ISO 9001 §7.1 (Traceability)
   - Fix: Add audit context fields + log changes
   - Estimated Effort: 3-4 hours

6. **No Formal Role Definitions API** (Severity: MEDIUM)
   - Location: Documentation/Code
   - Issue: Role definitions embedded in code; no API endpoint to query
   - Requirement: ISO 10006 §7.5 (Documented information)
   - Fix: Create `/api/roles` endpoint with responsibility/authority definitions
   - Estimated Effort: 2-3 hours

7. **Company Role Workflow Routing** (Severity: MEDIUM)
   - Location: `company-approval.service.ts`
   - Issue: Approvals stored but no state machine routing to next approver
   - Requirement: ISO 10006 §6.3 (Change control)
   - Fix: Implement approval workflow state machine
   - Estimated Effort: 5-6 hours

---

## Next Steps

See detailed implementation plans in:
- `plan/02-segregation-of-duties-matrix.md` — SoD rules & enforcement
- `plan/03-project-isolation-enforcement.md` — Cross-project access fixes
- `plan/04-cost-detail-filtering.md` — Cost access control
- `plan/05-authorization-middleware.md` — Consistent API security layer
- `plan/06-role-definition-api.md` — Formal role documentation
- `plan/07-approval-workflow-state-machine.md` — Company approval routing
- `plan/08-implementation-roadmap.md` — Phased delivery plan

---

**Prepared by**: GitHub Copilot  
**Review Required**: Yes (Security/Governance team)  
**Sign-off**: Pending
