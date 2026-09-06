# ISO PMS Gap Analysis

This document summarizes the ISO-to-code analysis for the Ovid Project Management System (PMS). It is a cross-referenced, traceable master view that links the detailed per-capability plans in this folder.

Standards used as authoritative baseline
- ISO/IEC 27001 — Information security management
- ISO/IEC 27002 — Security controls
- ISO/IEC 27034 — Application security
- ISO/IEC 25010 — Software product quality
- ISO/IEC 12207 — Software lifecycle processes
- ISO 9001 — Quality management

Scope of analysis
- Project lifecycle: creation → planning → execution → monitoring → control → close
- Roles and RBAC
- WBS, scheduling, tasks, baselines
- Change, risk, quality, procurement, and audit
- Data model and persistence (Prisma schema)
- APIs and enforcement points (src/app/api/*, src/lib/*)

How this folder is organized
- project-lifecycle.md — end-to-end lifecycle analysis and required changes
- project-creation.md — deep tracing of project creation flows, DB mappings, permissions
- project-roles-and-permissions.md — RBAC analysis and tests
- wbs-and-task-management.md — WBS structure, weighting, and task lifecycle
- task-assignment.md — task assignment lifecycle and audits
- progress-tracking.md — progress calculation, baselines, and variance
- schedule-management.md — activities, dependencies, baselines, critical path
- project-monitoring-and-control.md — KPIs, alerts, corrective actions
- change-management.md — change request flows, approvals, baselines
- risk-and-issues.md — risk register and linkage to work items
- quality-controls.md — ITRs, defects, inspections and traceability
- document-control.md — doc versioning, approvals and retention
- audit-and-traceability.md — audit model and missing trails
- database-architecture.md — schema analysis and required structural changes
- implementation-roadmap.md — ordered work plan, priorities, milestones

Next steps
1. Implement foundation changes (sessions, audit, RBAC enforcement, validation, encryption) per the per-capability files.
2. Add CI tests and contract tests to prevent regressions.
3. Track each change via issues and PRs. Use the roadmap for the sequence.

