# Project lifecycle — overview and findings

Purpose
Trace how the current code implements project lifecycle capabilities (create → plan → execute → monitor → close) and identify ISO-based gaps and required changes.

Current implementation (evidence & files)
- Project model: prisma/schema.prisma `model Project` (fields: id, code, name, contractorOrgId, clientOrgId, consultantOrgId, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, status).
- Project creation endpoints: `src/app/api/projects/*` (routes present as per README). Representative auth code: `src/lib/auth.ts`. RBAC in `src/lib/permissions.ts`.
- WBS anchored via `WbsNode` model and relation to Project. Schedule activities in `ScheduleActivity` model.

ISO requirements (applicable)
- ISO 9001 / 10006 (project quality & document control): documented project objectives, roles/responsibilities, documented baselines, approvals.
- ISO/IEC 12207 (lifecycle processes): defined initiation, planning, execution, monitoring, and closure with records and approvals.

Findings & gaps
1. Project metadata & objectives
   - Code stores name, code, type and dates, but no dedicated 'objectives' field or structured acceptance criteria.
   - Gap: Missing structured project objectives and acceptance criteria fields and sign-off lifecycle.
   - Impact: Cannot prove that project deliverables meet objectives; limited traceability for acceptance.
2. Project scope & scope baseline
   - Contracts and scopeDescription exist in Contract model. WbsNode contains scope relation, but no immutable scope baseline or versioned scope snapshots.
   - Gap: No baseline snapshots of WBS/contract scope at approval time.
3. Organizational structure & stakeholders
   - Organization and ProjectMembership models exist. CompanyApproval and CompanyStaffAssignment exist for organization-level approvals.
   - Gap: No explicit project RACI/roles matrix stored; projectRole in ProjectMembership is free text.
4. Project approvals & authorization
   - CompanyApproval exists for organization-wide approvals, but no explicit project creation approval workflow (API-level enforcement missing).
5. Project lifecycle transitions
   - Project.status exists but transitions appear uncontrolled: no enforced state machine with required approvals and preconditions.
6. Access control for creation/modification
   - RBAC functions exist, but no systematic per-route manifest proving enforcement. Some routes may rely on developer discipline.

Required architectural changes (summary)
- Add structured ProjectObjectives and AcceptanceCriteria fields and SignOff model usage tied to project-binding approvals.
- Implement immutable Baseline entities: ProjectBaseline, WbsBaseline, ScheduleBaseline capturing snapshot JSON with effectiveDate, createdBy, approvedAt.
- Enforce state machine transitions for Project.status with backend checks and required CompanyApproval records for certain transitions (e.g., PLANNING -> ACTIVE requires approval).
- Convert projectRole in ProjectMembership to enum or constrained type and add ProjectRoleAssignment history table for auditability.
- Add route-level permission manifest and enforce via wrapper to ensure only authorized roles can create/approve projects.

Files / DB changes (concrete)
- prisma/schema.prisma
  - Add `model ProjectObjective`, linked to Project, with fields {id, projectId, description, metric, targetDate, createdBy, createdAt}
  - Add `model ProjectBaseline { id, projectId, type, snapshot Json, createdBy, createdAt, approvedBy, approvedAt }`
  - Modify ProjectMembership.projectRole to be enum ProjectRole and attach history table ProjectRoleAssignment.
- src/lib/permissions.ts: add explicit permissions for project:create, project:approve, project:transition
- src/app/api/projects/*: wrap handlers with requirePermission('project:create') and requireApprovalFlow on transitions.

Backend/API changes
- Add API endpoints: POST /api/projects/:id/approve, POST /api/projects/:id/baselines, GET /api/projects/:id/baselines
- Enforce creation & status transitions server-side, ensure approvals create CompanyApproval records where required.

Frontend/UI changes
- Project creation form adds objectives and acceptance criteria; project detail UI offers Baselines tab showing approved snapshots; admin UI to approve projects.

Workflow changes
- Define approval workflow: project created (draft) → submit for approval → designated approver reviews → approve/ reject → approved baseline created and project transitions to PLANNING.

Priority & order
1. Add Baseline models and snapshotting (critical)
2. Enforce transitions and approval checks (critical)
3. Add objectives model and UI (medium)
4. Convert membership roles and history (medium)

Verification
- Project cannot move to ACTIVE without an approved Baseline record; attempts return 403.
- Baselines contain exact WBS snapshot JSON and schedule snapshot; restored snapshot can reproduce state.

