# Database architecture — analysis and plan

Snapshot of relevant models inspected
- Project, WbsNode, ScheduleActivity, User, ProjectMembership, Invitation, Contract, VariationOrder, RiskEntry, DocumentTemplate, SignOff, DesignReview

Key database capabilities and missing features
1. Referential integrity: prisma schema uses relations and cascade rules; overall sound.
2. Versioning: missing explicit version tables for baselines and many domain objects (WBS, Schedule, Contracts, Documents)
3. Validation: business constraints (100% sibling weight) cannot be enforced purely by DB; requires application-layer validation and DB-side triggers if necessary.
4. Audit logging: missing central model

Required schema-level changes (concrete)
- Add models: ProjectBaseline, ScheduleBaseline, WbsBaseline (or a unified Baseline model with type discriminator)
- Add ProgressEntry, ActivityDependency, TaskAssignment, TaskAttachment, AuditLog, ProjectRoleAssignment, RiskAssessment
- Add indices and foreign keys to support queries for time-series, progress lookups, and audit queries

Migration strategy
- Add new models as non-breaking additions.
- Use migration scripts (prisma migrate) and backfill essential baselines by snapshotting current state into new baseline records with createdAt in the past.
- For fields that change type (e.g., projectRole string -> enum), add new enum column, backfill values via script, and deprecate old field.

Performance & scaling considerations
- AuditLog and ProgressEntry can grow large. Plan partitioning by date or archiving job; add index on (projectId, createdAt).
- Consider using append-only event store for high-write audit logs or a separate analytics datastore for aggregated progress snapshots (e.g., ClickHouse).

Verification
- Migrations applied in staging and backfill scripts executed; query performance validated on sample DB size

