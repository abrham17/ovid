# Audit and traceability — analysis and plan

Goal
Ensure system can answer: who did what, when, why, under whose authority, what changed, and resulting state.

Current indicators
- SignOff model exists; AuditFinding exists; no explicit AuditLog model found in schema excerpt (though AuditAction enum exists)

Major gaps
1. No central AuditLog table capturing CREATE/UPDATE/DELETE actions with before/after payloads, user, ip, requestId.
2. Missing entity version history tables (e.g., ProjectHistory, WbsNodeHistory) to reconstruct prior states beyond SignOff snapshots.
3. No immutable tamper-evident mechanism (append-only with write permissions) for audit events.

Required changes
- Add `AuditLog` model capturing {id, actorId, action, entityType, entityId, diff Json, timestamp, ip, userAgent, requestId}
- Implement Prisma middleware to generate AuditLog entries for configured models (projects, wbsNodes, scheduleActivities, users, projectMemberships, changeRequests, variationOrders)
- Add entity history (optional but recommended) either via event sourcing design (append-only events) or via `EntityHistory` tables storing snapshot and timestamp
- Add admin endpoints for audit exports and secure retention (read-only for auditors)

Files & implementation
- prisma/schema.prisma: add AuditLog model
- src/lib/db.ts: register Prisma middleware to write audit logs before/after write operations
- src/lib/services/audit.ts: helper functions for structured diffs
- UI: Admin Audit Viewer (read-only) behind Internal Auditor role

Verification
- Actions creating/updating entities produce AuditLog entries with diffs; test ensures logs cannot be modified via API

Priority
- AuditLog model + middleware: critical

