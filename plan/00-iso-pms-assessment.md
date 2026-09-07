# ISO-to-Code PMS Assessment

## 1. Scope and authoritative basis

This assessment is based on the executable repository as inspected on 2026-09-07. It covers the Next.js app, Prisma schema/migrations, API handlers, service layer, scope model, UI role dashboards, validation, tests, and the local `ISO STANDARD/` library.

The local library contains company procedures and forms, not licensed copies of normative ISO text. The applicable external foundation is therefore identified by standard and clause topic, while every implementation claim below is grounded in repository evidence:

| Standard | Applicable foundation |
|---|---|
| ISO 21502:2020 | project governance, project life cycle, scope/WBS, schedule, resources, risks/issues, change, monitoring and reporting |
| ISO 10006:2017 | quality management in projects, responsibilities, quality planning, verification, nonconformity and records |
| ISO 9001:2015 | 5.3 roles/responsibilities; 7.5 documented information; 8.1 operational planning/control; 8.5 controlled execution; 9.1 monitoring; 10.2 corrective action |
| ISO 31000:2018 | risk identification, ownership, treatment, monitoring and communication |
| ISO 19011:2018 | audit evidence, independence, findings, corrective-action verification and audit trail |
| ISO/IEC 27001:2022 | access control, least privilege, segregation of duties, identity lifecycle and logging (Annex A control themes) |
| ISO 15489-1:2016 | authentic, reliable, complete, usable and retained project records |

ISO alignment is assessed as **Full**, **Partial**, **Not compliant**, or **Missing**. A feature name, UI button, or database column is not treated as control evidence unless the API and business logic enforce it.

## 2. System map

- **Runtime:** Next.js 15 App Router, React 19, TypeScript, PostgreSQL via Prisma 6.
- **Identity:** `src/lib/auth.ts` issues a seven-day HS256 JWT cookie and re-reads the user and active company assignments on each request.
- **Authorization:** `src/lib/permissions.ts` has a global `UserRole` matrix and a separate company-role matrix; `src/lib/scope/*` adds party and WBS/assignment narrowing.
- **Project structure:** `Project`, `WbsNode`, `ScheduleActivity`, `ScheduleDependency`, `ActivityAssignment`, `SectionAssignment`, `ProjectRoleAssignment`.
- **Control records:** `ProjectBaseline`, `ProjectStatusHistory`, `ProgressSnapshot`, `ScheduleChangeRequest`, `CompanyApproval`, `SignOff`, `DecisionLog`, `AuditLog`.
- **Execution domains:** daily reports, cost/BoQ/measurements/variations, procurement, resources, safety, quality, risks, disputes, documents, contracts, oversight and interventions.
- **UI:** project tabs under `src/app/(dashboard)/projects/[projectId]` and role dashboards under `src/components/dashboards`.
- **Tests:** only company RBAC and company portfolio tests are present; there are no API authorization, project isolation, workflow, schedule, baseline, progress, or audit integration tests.

## 3. Findings requiring implementation

### F-001 — Project authorization is not consistently project-scoped

**ISO basis:** ISO/IEC 27001 least privilege and access restriction; ISO 9001 §5.3 accountability. A user must access only projects and records within their assigned authority.

**Current implementation:** `assertProjectAccess` in `src/lib/permissions.ts:411-463` accepts an organization-linked project even when no `ProjectMembership` exists. `listProjects` also exposes every project linked to the user's organization (`project.service.ts:25-31`). `getEffectiveScope` calls this permissive check. Party/WBS scopes then narrow some reads, but the initial project authorization is already broader than assignment.

**Status:** Not compliant for project isolation; partial for WBS isolation.

**Gap and impact:** Any active user of a contractor/client/consultant organization can reach project routes for every project involving that organization. This exposes project metadata and creates a path to data access if a downstream service forgets a scope filter. It also makes “project role” non-authoritative.

**Required change:** Introduce a single `ProjectAccessDecision` service requiring an active membership or an explicitly documented organization-level oversight grant. Separate `canDiscoverProject` from `canReadProjectData`; default deny without membership. Require every project-domain query to use a project authorization predicate and effective WBS scope.

**Database:** Make membership assignment explicit (`active`, `startsAt`, `endsAt`, `assignmentSource`, `assignedById`, reason). Add composite foreign-key strategy or service-level invariant checks so membership organization equals user organization and project party. Add an access-grant/oversight record for exceptional read-only access.

**Backend/API:** Refactor `assertProjectAccess`, `listProjects`, every project service, and the legacy `[id]` routes. Add authorization middleware/helper used by every route. Never use an organization OR predicate as a substitute for membership.

**Frontend:** Filter project switchers and dashboard cards by the new discovery decision; show explicit “assigned/oversight” context. Do not rely on hidden tabs.

**Dependencies:** F-002, F-003, F-009. **Priority:** P0.

**Acceptance:** A user with no active membership and no explicit oversight grant receives 403/404 for project detail, WBS, schedule, progress, documents, audit-linked records and all mutations; cross-organization IDs cannot be enumerated; tests cover every role and party type.

### F-002 — Global role, project role, and assignment role are three disconnected authorities

**ISO basis:** ISO 9001 §5.3 and ISO/IEC 27001 identity/access governance require clear responsibility and authority ownership.

**Current implementation:** `User.role` is a global enum; `ProjectMembership.projectRole` is an unconstrained `String`; `ProjectRoleAssignment.role` is a separate enum; activity/section/oversight assignments are additional layers. `assertProjectAccess` returns membership `projectRole` cast to `UserRole`, but `assertPermission` evaluates the returned user’s global `role`, not the membership role. Many services compare `user.role` directly.

**Status:** Partial, with incorrect authority resolution.

**Gap and impact:** A project-specific appointment cannot reliably change capability. A user may be displayed as one role while authorization uses another. Multiple simultaneous roles and incompatibilities are not modeled.

**Required change:** Define one canonical role-assignment model with scope, validity, appointing authority, and capability profile. Resolve an effective role set per project/request; use it everywhere instead of `user.role` comparisons. Keep global employment/job classification separate from project appointment.

**Database:** Replace `projectRole String` with `ProjectRole` plus `active/startsAt/endsAt`; unify or explicitly relate `ProjectMembership`, `ProjectRoleAssignment`, `SectionAssignment`, and `ActivityAssignment`; add uniqueness for one active appointment where required and incompatibility constraints.

**Backend/API:** Add `resolveEffectiveProjectRoles()` and `assertCapability(user, projectId, capability, scope)`. Remove direct role checks from services or wrap them in policy functions. Record appointments and revocations in audit history.

**Frontend:** Render capability decisions returned by the server, not a global role label. Support role-specific dashboards only after effective-role resolution.

**Dependencies:** F-001, F-003, F-006. **Priority:** P0.

**Acceptance:** A user can hold different valid roles on two projects; API permissions follow the project appointment; conflicting combinations are rejected or require documented compensating approval; all role changes are historized.

### F-003 — Central route authorization is dead code and its map is stale

**ISO basis:** ISO/IEC 27001 defense in depth and least privilege require enforceable server-side authorization.

**Current implementation:** `src/lib/authorization.ts` defines `assertRoutePermission`, but `rg` shows it is only defined and imported nowhere. `src/permissions/route-permissions.json` uses resource names (`dailyReport`, `dashboard`) absent from the `Resource` union (`daily_report`, no dashboard). Most handlers call services directly; legacy handlers call nonexistent APIs.

**Status:** Not compliant as a centralized control; partial through service-level checks.

**Gap and impact:** Coverage depends on each service author remembering both authentication and permission checks. New or legacy routes can bypass policy. The intended fail-closed map is not operational.

**Required change:** Make route policy executable: typed route registry, wrapper around every handler, route tests that fail on unmapped methods, and service authorization as a second layer. Normalize resource identifiers.

**Database:** No structural change; add a policy/version register if audit evidence of permission changes is required.

**Backend/API:** Wire `assertRoutePermission` into all handlers; replace `getSessionUser/apiResponse/apiError` legacy imports with the canonical auth/API helpers; add explicit checks for route-specific ownership and project scope.

**Frontend:** None for enforcement; use server capability payloads for presentation.

**Dependencies:** F-001/F-002. **Priority:** P0.

**Acceptance:** Static test enumerates every `src/app/api/**/route.ts` method and confirms a policy wrapper; direct unauthorized requests return 401/403; route map type-checks.

### F-004 — Baseline approval violates segregation of duties and immutability

**ISO basis:** ISO 21502 baseline/change control; ISO 9001 §8.1 controlled planning; ISO/IEC 27001 segregation of duties.

**Current implementation:** `createInitialBaseline` (`project.service.ts:211-252`) creates an integrated JSON snapshot and sets `approvedById: user.id` and `approvedAt` immediately. `POST /api/projects/[id]/baselines` only requires project update. `ProjectBaseline.snapshot` is untyped JSON, with no hash, source version, approval decision, or lock. `transitionProjectStatus` only checks that a baseline exists, not that an independent approval exists.

**Status:** Not compliant.

**Gap and impact:** The author can approve their own baseline, alter source records after snapshot, and transition a project with an unreviewed plan. Audit evidence cannot prove what was approved.

**Required change:** Implement draft → submitted → approved/rejected baseline workflow. Approval must be performed by an authorized independent role and must freeze a canonical snapshot with hash and source versions. Mutations after approval require controlled change requests.

**Database:** Add baseline status, submitted/reviewed fields, approval comment, immutable hash, schema version, source revision IDs, and `lockedAt`; prohibit update/delete after approval by service and database permissions where practical.

**Backend/API:** Split create/submit/review endpoints; enforce no self-approval and segregation rules; gate ACTIVE transition on approved scope/schedule/cost baseline and required evidence; audit every state transition.

**Frontend:** Show baseline state, reviewer, evidence and lock; remove one-click self-approval.

**Dependencies:** F-002, F-006, F-008. **Priority:** P0.

**Acceptance:** Author cannot approve own baseline; approved snapshot hash remains stable; ACTIVE transition fails without independently approved baseline; every decision has actor/time/reason.

### F-005 — Project lifecycle gates are incomplete and status can be arbitrarily changed

**ISO basis:** ISO 21502 lifecycle governance and ISO 9001 operational planning/control.

**Current implementation:** `transitionProjectStatus` (`project.service.ts:255-301`) accepts any target enum and only checks baseline count for ACTIVE. It does not enforce legal transitions, objective/scope/WBS/team/contract readiness, suspension/resumption evidence, completion acceptance, or closure records. `updateProject` also accepts `status` directly (`:304-334`), bypassing transition history.

**Status:** Partial structure, not compliant control.

**Required change:** Define a state machine and phase-gate checklist; remove status mutation from generic PATCH; require gate evidence and authorized approver for each transition.

**Database/backend/frontend:** Add gate checklist/evidence and transition decision records; enforce state machine in one service; render pending gates and rejection reasons.

**Dependencies:** F-004, F-010. **Priority:** P1.

**Acceptance:** Invalid transitions and generic status PATCH are rejected; completion requires accepted deliverables/open-risk disposition; closure freezes records and records approver/evidence.

### F-006 — Progress/EVM controls do not measure planned performance

**ISO basis:** ISO 21502 monitoring/control and ISO 9001 §9.1 monitoring and analysis.

**Current implementation:** Weighted physical roll-up exists in `progress.service.ts:32-264`, with quality-cleared view. But `recordProgressSnapshot` (`:365-422`) sets `plannedValue = earnedValue` (`:379`), therefore SPI and schedule variance are always 1/0. It aggregates all cost actuals without an approved cost baseline or as-of cut-off, and has no actor/source/evidence. `GET/POST /api/projects/[id]/progress/history` directly queries/writes by project ID without `assertProjectAccess` or permission. The progress route labels a parameter `wbsNodeId` then passes it to `computeActivityProgress`, which expects an activity ID (`progress route`, `progress.service.ts:295-302`).

**Status:** Not compliant for performance control; partial for physical roll-up.

**Required change:** Store time-phased baseline PV, approved EV rules, actual cost cut-off, forecast dates, variance thresholds, source evidence and snapshot provenance. Separate physical progress from accepted/quality-cleared progress and planned progress. Fix endpoint identifiers and authorization.

**Database:** Add `ProgressSnapshot` as-of/source/user fields, baseline linkage, PV calculation period, forecast metrics, threshold status, and immutable append-only semantics; add activity progress history/evidence.

**Backend/API:** Calculate PV from approved schedule/cost baseline, EV from accepted measurement/weight rules, AC from reconciled sources; reject overwrite of a historical snapshot; authorize history and snapshot creation.

**Frontend:** Display PV/EV/AC, CPI/SPI, variance, as-of date, quality-cleared delta and evidence links; never label a single subjective percentage as schedule performance.

**Dependencies:** F-004, F-007. **Priority:** P0.

**Acceptance:** A delayed activity produces SPI < 1; historical snapshots are immutable and reproducible; unauthorized users cannot read or create snapshots; activity endpoint returns the requested activity.

### F-007 — Schedule control is useful but revisions do not fully propagate

**ISO basis:** ISO 21502 schedule/dependency/control guidance.

**Current implementation:** `schedule.service.ts` validates date order, cycles, dependencies and computes CPM/float. `ScheduleChangeRequest` preserves baseline dates and approval updates planned dates. However, approved changes do not create a new schedule baseline/version, recompute downstream dates, record impact on critical path, or write an audit entry. Dependency review is guarded by generic schedule update rather than an explicit approve capability in part of the service.

**Status:** Partial.

**Required change:** Treat schedule revisions as controlled versions: impact analysis, affected activities, critical-path/float delta, approved forecast, and baseline/change linkage. Add explicit reviewer policy and audit event.

**Acceptance:** Approved revision shows before/after schedule, impact set, approver, reason, downstream forecast and updated control metrics; rejection leaves live schedule unchanged.

### F-008 — There is no complete task execution lifecycle or evidence gate

**ISO basis:** ISO 21502 work-package/activity execution; ISO 10006 verification and quality evidence.

**Current implementation:** The schema has `ScheduleActivity` and assignments, but no `Task` entity, acceptance state, responsible-party set, planned/actual effort, completion evidence, verifier, approval/closure, reopen reason, escalation or task-level history. Activity update can set percentage and status; COMPLETE invokes a quality gate, but completion evidence and independent verification are not stored.

**Status:** Missing/partial.

**Required change:** Either extend activities into a governed work-item model or add `Task` linked to WBS/activity, with submit/accept/execute/update/verify/approve/close/reopen transitions and evidence.

**Database/backend/frontend:** Add immutable transition/history/evidence records, multi-party responsibility and due/escalation fields; expose command endpoints with actor checks; build role-specific inbox and verification views.

**Dependencies:** F-002, F-009, F-010. **Priority:** P1.

**Acceptance:** No task can be closed without required evidence and verifier; assignee cannot self-verify where segregation is required; overdue/escalation records are generated and traceable.

### F-009 — Monitoring/control endpoints bypass authorization and use a false control cycle

**ISO basis:** ISO 21502 monitoring/control cycle; ISO 9001 §9.1 and corrective action.

**Current implementation:** `src/app/api/projects/[id]/control-check/route.ts` and `progress/history/route.ts` obtain a session but do not check project access or permission. `control-check` calls `recordProgressSnapshot(projectId)` and creates an executive intervention based on SPI; because F-006 makes SPI 1, the schedule exception never fires. `recordProgressSnapshot` has no user argument.

**Status:** Not compliant and security-critical.

**Required change:** Protect monitoring commands, make them scheduled/service-account or explicitly authorized, and connect threshold exception → accountable owner → corrective action → verification → closure.

**Acceptance:** Direct requests from unrelated users fail; a real threshold breach creates one deduplicated intervention with source snapshot, owner, due date, response and verification state.

### F-010 — Auditability is broad in schema but incomplete in behavior and isolation

**ISO basis:** ISO 19011 evidence and ISO 15489 authentic records; ISO/IEC 27001 logging.

**Current implementation:** `AuditLog` stores entity/action/user/time/diff, and many services call `recordAuditLog`. But ordinary WBS/activity/project/document/risk/quality updates and deletes are not consistently logged; several direct `db.update/delete` calls have no audit event. `GET /api/audit-logs` accepts arbitrary `entityType/entityId`, has no organization/project filter and uses a broken legacy import (`getSessionUser`, `apiError`, `apiResponse`). Audit logs can therefore be unavailable at build time and, once fixed, over-broad.

**Status:** Partial records, not compliant end-to-end.

**Required change:** Centralize mutation auditing in transaction wrappers, define mandatory event schema (before/after, reason, correlation/request ID, authority, source), prohibit hard delete for controlled records, and scope audit queries by organization/project and auditor assignment.

**Acceptance:** For any controlled entity, the system answers who/what/when/why/authority/result; delete is either prohibited or produces a tombstone; auditors cannot read another organization.

### F-011 — Document control has revision links but lacks complete records controls

**ISO basis:** ISO 9001 §7.5 and ISO 15489.

**Current implementation:** `ProjectDocument` and `DocumentTemplate` provide revision numbers, status, issuer/approver and supersession. `getInheritedDocuments` returns ISSUED documents along WBS ancestors. File paths are nullable strings; there is no content hash, media type/size, malware scan result, retention/disposal rule, download audit, legal hold, or immutable content store. Download authorization must be verified independently.

**Status:** Partial.

**Required change:** Add controlled repository metadata, immutable object storage references, checksum, retention/classification, access/download events, approval/rejection workflow and supersession invariants.

**Acceptance:** Issued content cannot be silently replaced; every revision and download is traceable; expired records are retained/disposed only under policy and legal hold.

### F-012 — Risk, issue, quality and corrective-action domains are not one closed-loop system

**ISO basis:** ISO 31000; ISO 10006; ISO 9001 §10.2.

**Current implementation:** `RiskEntry` has likelihood/impact/owner/mitigation/status and links to stoppage/variation/decision. Quality has inspections, defects, disputes and punch list; safety has observations/incidents. These are valuable structures, but risk scoring bounds, residual risk, treatment due dates, issue/problem distinction, CAPA root cause/effectiveness verification, and mandatory links from failed quality/safety events to tasks, schedule and change control are absent or inconsistent. Risk/quality records use generic permission checks and often lack evidence/history.

**Status:** Partial.

**Required change:** Add common issue/CAPA model or explicit links, risk treatment/residual fields, owners and due/escalation, verification/effectiveness, and control-cycle reporting.

**Acceptance:** Every high risk has owner/treatment/due date and residual rating; every nonconformity has containment, root cause, corrective action, verifier and effectiveness result; unresolved items affect gates/reporting.

### F-013 — Resource accountability exists, but availability/conflict and planned-vs-actual controls are missing

**ISO basis:** ISO 21502 resource planning and responsibility assignment.

**Current implementation:** Labor, equipment, materials, section/activity assignments and resource requests exist. There is no authoritative availability calendar, capacity/workload, double-booking prevention, planned-vs-actual resource use, competency/qualification check, or assignment acceptance.

**Status:** Partial.

**Required change:** Add resource master/availability, competency, allocation periods, conflict detection, acceptance and actual usage reconciliation; link resource exceptions to schedule/cost controls.

### F-014 — Referential integrity and invariant enforcement rely too heavily on service code

**ISO basis:** ISO 9001 controlled processes and ISO 15489 record reliability.

**Current implementation:** Prisma relations and indexes are extensive, but many relationships do not encode same-project invariants (for example a measurement's `contractId` and `wbsNodeId` are independently related). Some services check project equality; direct queries and legacy routes do not. JSON fields hold manpower, equipment, findings and snapshot structures without schemas.

**Status:** Partial.

**Required change:** Add database constraints where possible, composite relation keys or validation transactions, typed JSON schemas/versioning, and invariant property tests.

**Acceptance:** Cross-project links are rejected at database/service boundary; malformed JSON payloads fail validation; migration tests verify constraints.

### F-015 — Verification baseline is weak: typecheck fails and test coverage omits control paths

**Evidence:** `npm run typecheck` fails in `daily/page.tsx` and multiple legacy `[id]`/audit routes because imported symbols do not exist, plus `src/lib/services/audit.ts` imports an unavailable generated module path. Existing tests cover only company RBAC/portfolio logic.

**Status:** Not compliant as a release-control foundation.

**Required change:** Restore build health, then add policy, isolation, workflow, baseline, progress, schedule, document and audit integration tests before implementing P0 controls.

**Acceptance:** Typecheck/build pass; CI executes authorization matrix and invariant tests against a disposable PostgreSQL database; no controlled endpoint is untested.

## 4. Areas that should be preserved

Preserve and adapt the existing WBS tree/cycle checks, CPM solver, weighted roll-up, quality-cleared progress view, party/WBS scope concept, schedule-change request structure, contract/oversight workflow, document revision chain, decision log, status history, company approval queue, and audit event helper. They are useful building blocks once placed behind the canonical authorization, baseline, evidence and history controls above.
