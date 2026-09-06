# WBS and Task Management — analysis and plan

ISO references
- ISO 21500 (guidance on project management concepts) & ISO/IEC 12207 lifecycle
- ISO/IEC 25010 functional suitability

Current implementation
- `WbsNode` model represents tree nodes with parentId, weightPercent, nodeType, planned dates and relationships to activities and work items.
- `ScheduleActivity` model exists with baselineStart/baselineFinish and planned/actual dates.
- Activities link to WbsNode via wbsNodeId and ActivityStatus enum.

Key observations
1. Weighting & 100% rule: WbsNode contains weightPercent and comment indicates siblings must sum to 100 and fallback behavior exists.
2. Plan submissions: planSubmissionId in WbsNode tracks subcontractor plan submissions (workflow present).
3. Activities have baseline and planned dates; but lack explicit baseline versioning (ScheduleBaseline) tied to ProjectBaseline.
4. Task/Activity assignment model: ActivityAssignment exists linking activities to users (activityAssignments in User model). But audit history of assignments not obvious.

Gaps and consequences
- No enforced 100% validation at DB/middleware level: invalid weights may break rollups.
- No versioned baseline for WBS and schedule snapshots tied to approved baselines. Without baselines, cannot compute earned value or schedule variance accurately.
- Activity dependencies exist via DependencyType enum and likely via PendingDependencyRequest model; ensure dependency enforcement and blocking behavior in scheduling algorithms.
- Task lifecycle lacks standardized progress/actuals schema (planned hours vs actual hours) in activity or assignment models.

Required schema changes
- Add `WbsBaseline`, `ScheduleBaseline` models (or reuse ProjectBaseline with type discriminator) to store snapshots as JSON with reference to author and approvedBy.
- Add `ActivityActuals` model capturing actualHours, progressPercent, recordedAt, recordedBy.
- Enforce weights: DB-level check not supported by Prisma; implement Prisma middleware that validates sibling weights sum to 100 on update/insert for nodes in same parent.
- Add `ActivityDependency` explicit model linking activityId -> dependentActivityId with lag/lead and type (FS/SS/FF/SF).

Backend changes
- When plan submission approved: create Baseline snapshot including WBS nodes, schedule activities, BOQ items, and persist as ProjectBaseline.
- Implement roll-up calculation service `src/lib/services/progress.ts` that computes WBS/Project progress using baseline vs actuals and weights, and stores a ProgressSnapshot for historical reporting.

Frontend changes
- WBS editor should prevent saving inconsistent weights and offer guided weight distribution tools; Plan submission UI to include preview of snapshot and submit for approval.

Verification
- Unit tests for weight validation and baseline snapshot creation.
- Integration tests check progress rollup against sample baseline and actuals.

Priority
- Baseline versioning & validation: critical
- Activity actuals model: high
- Dependency explicit model: medium

