# Project creation — detailed analysis and plan

ISO requirement highlights
- ISO/IEC 12207: Initiation requires documented authorization.
- ISO 9001 / 10006: Project objectives, assigned responsibilities, approvals must be recorded and auditable.

Where project creation is implemented
- Prisma: `model Project` in prisma/schema.prisma
- API routes: `src/app/api/projects` (list/create endpoints referenced in README)
- Authorization utilities: `src/lib/auth.ts`, `src/lib/permissions.ts`

Current code behavior
- Project model stores fundamental fields but lacks structured objectives and acceptance criteria.
- Project creation likely performed by `POST /api/projects` route; RBAC enforced by helper functions but lack manifest and tests.
- No baseline or immutable project snapshot created upon approval.

Gaps & why they matter
1. Missing objectives → acceptance unclear; audit cannot show whether project delivered observable objectives
2. No baseline snapshot → cannot compare later changes to the baseline (required for change control)
3. Loose projectRole in ProjectMembership → inconsistent role semantics; hinders automation (who can approve?)

Required code & schema changes
- Prisma additions
  - model ProjectObjective { id, projectId, description, metric, targetValue, targetDate, createdById, createdAt }
  - model ProjectBaseline { id, projectId, type Enum('SCOPE','SCHEDULE','COST'), snapshot Json, createdById, createdAt, approvedById, approvedAt }
  - enum ProjectRole { PROJECT_MANAGER, SITE_ENGINEER, FOREMAN, CLIENT_REP, CONTRACTOR_PM, QA, HSE, QS, OTHER }
  - model ProjectRoleAssignment { id, projectId, userId, role ProjectRole, assignedById, assignedAt, endedAt }
- Backend
  - Add endpoints & service functions for objectives: POST/GET/DELETE objectives; tie create/update to SignOff/approval if required.
  - On project submit-for-approval: create ProjectBaseline records (snapshot WBS + schedule + BOQ) and create CompanyApproval entry requiring approver role.
  - Enforce server-side state machine for Project.status with preconditions (draft -> planning -> active requires approved Baseline).
- Frontend
  - Project creation form adds Objectives section and a 'Submit for approval' action. 'Approvals' UI for approver to approve baseline.

Files affected
- prisma/schema.prisma
- src/lib/services/project.ts (or add new service) — create baseline snapshot logic
- src/app/api/projects/route.ts and nested handlers
- src/lib/permissions.ts — add new permission keys
- src/app/(dashboard)/projects UI components — project form additions

Acceptance criteria
- Creating a project in the API accepts objectives and stores them in DB; project cannot transition to ACTIVE without approved baseline.
- Baseline snapshot contains WBS nodes JSON and schedule activities JSON that can be read back and compared.

