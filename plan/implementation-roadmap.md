# Implementation roadmap — ordered workplan

Purpose
An ordered, dependency-aware plan that allows incremental implementation with verification gates. Foundation items first.

Phase 0 — Preparation
- Add CI workflow and test DB (plan/009). Create branch `iso-gap-analysis-plans` (done).
- Create route-permissions manifest skeleton and authorization wrapper.

Phase 1 — Foundation (Critical)
1. Sessions & token revocation (plan/001)
   - Add Session model, verification checks, refresh/revoke endpoints
2. Audit logging (plan/004 & audit-and-traceability.md)
   - Add AuditLog model and Prisma middleware
3. RBAC consolidation (plan/project-roles-and-permissions.md)
   - ProjectRole enum and assignment history; central authorization wrapper
4. Validation wrapper & OpenAPI generation (plan/005)

Phase 2 — Core project controls (High)
5. Baseline versioning & project approvals (project-creation.md)
   - ProjectBaseline & snapshotting on approval; enforce project transition state machine
6. WBS & schedule baselineing and scheduler engine (plan/wbs-and-task-management.md & schedule-management.md)
7. Progress capture and EVM metrics (plan/progress-tracking.md)
8. TaskAssignment lifecycle and sign-offs (plan/task-assignment.md)

Phase 3 — Monitoring & governance (High → Medium)
9. KPI engine and alerts (project-monitoring-and-control.md)
10. Change management & impact analysis (plan/change-management.md)
11. Risk history & linkage (plan/risk-and-issues.md)
12. Quality gates & ITR enforcement (plan/quality-controls.md)

Phase 4 — Documentation, DR, CI, and process (Medium)
13. Secret management & key rotation (plan/002)
14. Backup & DR runbooks (plan/008)
15. CI security scans, Dependabot (plan/009)
16. Docs: ISO mapping and policies (plan/011)

Deliverables & PR granularity
- Each major phase item becomes one or more PRs, each focused on a small scope (schema migration + service + route + tests).
- Example PR breakdown for Session & Audit: PR1 add Session model + migration; PR2 add Session logic in auth.ts + tests; PR3 adding refresh/revoke endpoints + tests.

Acceptance gates
- CI passes: tests, lint, typechecks
- Automated integration tests for auth, RBAC, baseline enforcement
- Manual security review for secrets change
- Audit logs present for all critical flows

