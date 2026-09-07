# ISO-Aligned Implementation Roadmap

This is the execution order for findings in `00-iso-pms-assessment.md`. Do not start UI redesign or broad refactoring before P0 controls are complete.

## Phase 0 — restore a verifiable foundation (P0)

1. **Build health (F-015).** Fix legacy auth/API imports in audit, baseline, control-check, progress-history, objectives, transition and document-download routes; annotate `serializeVal`; correct the generated Prisma import in `audit.ts`. Add CI `typecheck`, build and migration checks.
2. **Canonical policy (F-002/F-003).** Define typed capabilities, effective project role resolution, policy wrappers, and a route registry that enumerates every API method. Replace direct `user.role` authorization with policy calls. Preserve existing resource matrix as migration input, not as the final authority.
3. **Project isolation (F-001).** Require active membership or a documented time-bounded oversight/access grant. Apply the predicate in project discovery, every service query and all legacy `[id]` routes. Add cross-organization and no-membership tests.
4. **Audit transaction boundary (F-010).** Add request/correlation metadata and mandatory before/after/reason/authority fields. Wrap mutations and status changes in transactions; prohibit uncontrolled hard deletion. Scope audit reads to organization and auditor assignment.

## Phase 1 — governance, lifecycle and controlled foundation (P0/P1)

5. **Baseline workflow (F-004).** Migrate `ProjectBaseline` with status, hash, schema/source versions, submission/review fields and lock. Create submit/review APIs, independent approval and gate evidence. Remove self-approval and generic status mutation.
6. **Lifecycle gates (F-005).** Add a legal state machine and gate checklist for planning, active, suspended, complete and closed. Gate ACTIVE on approved scope/schedule/cost and team; gate COMPLETE/CLOSED on deliverables, open-risk disposition, quality acceptance and records freeze.
7. **Project foundation completeness.** Extend project creation/conversion to persist objectives, scope statement, stakeholder register, organization/role assignments, contract, initial WBS and approval provenance. Preserve tender-to-project conversion and company approval services.

## Phase 2 — integrated planning and execution (P1)

8. **Work package/task lifecycle (F-008).** Add governed `Task` or extend `ScheduleActivity` with responsibility, planned/actual effort, acceptance, evidence, verification, approval, reopen and escalation history. Link tasks to WBS, schedule, resources, quality and risks.
9. **Schedule revisions (F-007).** Extend change requests with impact analysis, affected activities, critical-path/float deltas, downstream forecasts and baseline/version linkage. Enforce explicit approve capability and immutable change history.
10. **Resource controls (F-013).** Add availability/capacity/competency and allocation periods, conflict detection, assignment acceptance and planned-vs-actual usage. Link resource requests to contract/WBS and approval thresholds.
11. **Quality/risk/CAPA closure (F-012).** Add residual risk, treatment due dates, issue/problem/CAPA linkage, root cause, effectiveness verification and escalation. Make failed inspection/safety events block completion or create controlled corrective work.

## Phase 3 — truthful monitoring and reporting (P0/P1)

12. **Progress/EVM (F-006/F-009).** Link snapshots to approved baselines; calculate time-phased PV, accepted EV and reconciled AC at an as-of cut-off. Store immutable snapshots, quality-cleared delta, forecast dates, thresholds and evidence. Fix activity-ID API semantics and protect history/control-check endpoints.
13. **Control cycle.** Implement threshold → exception → accountable owner → corrective action → verification → closure; deduplicate interventions and expose source snapshot/decision links. Add management reports for schedule, cost, quality, safety, risk, resources and change.

## Phase 4 — controlled information and assurance (P1/P2)

14. **Document records (F-011).** Add content hash, MIME/size, object-store key, classification, retention/disposal, legal hold, download audit, issue/approval/rejection workflow and immutable supersession chain. Preserve WBS ancestor inheritance.
15. **Database invariants (F-014).** Add composite/project consistency constraints, typed JSON validation/versioning and migration checks for contracts, measurements, WBS, activities and documents.
16. **Audit and assurance tests (F-010/F-015).** Add end-to-end evidence queries proving who/what/when/why/authority/result; independent auditor views; deletion/tombstone tests; permission matrix/property tests; scheduled snapshot reproducibility tests.

## Phase 5 — role-based UX and operational adoption (P1/P2)

17. Return server-derived effective capabilities, scope, redaction and pending approvals to dashboards. Adapt existing role dashboards and project tabs; do not duplicate authorization in components.
18. Add inboxes for assignment acceptance, verification, approvals, overdue items, corrective actions and interventions. Display as-of dates, baseline version, evidence and decision history.
19. Publish controlled procedures, role descriptions, approval thresholds, retention rules, exception handling and administrator/break-glass instructions in the existing `plan/` and operational documentation set.

## Cross-cutting verification

- Every phase has Prisma migration, service tests, API authorization tests and UI smoke tests.
- Security tests cover IDOR, cross-party access, revoked users, expired assignments, self-approval and direct API calls.
- Control tests cover baseline immutability, schedule variance, EVM calculations, quality gates, CAPA effectiveness and audit completeness.
- Release gate: `npm run typecheck`, `npm test`, production build, migration deploy, seeded role matrix and a disposable PostgreSQL integration suite all pass.
