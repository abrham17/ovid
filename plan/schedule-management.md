# Schedule management — analysis and plan

Scope
Evaluate schedule structures: activities, dependencies, baselines, critical path capability, and change handling.

Current data model
- `ScheduleActivity` model with baseline/planned/actual dates
- DependencyType enum and PendingDependencyRequest model referenced
- StoppageEntry model for stoppages

Findings
1. Dependency modeling unclear: no explicit ActivityDependency model in schema excerpt; presence of PendingDependencyRequest suggests a request workflow but not enforced dependencies at runtime.
2. No Critical Path Method (CPM) implementation found in code; no service that calculates earliest/latest dates, float, or critical path.
3. Baseline handling missing: baselineStart/baselineFinish fields exist on activities but not versioned across baselines.
4. Schedule change requests exist (ScheduleChangeRequest relation in User model) but lifecycle & approval enforcement need validation.

Required structural changes
- Add `ActivityDependency` model with fromActivityId, toActivityId, type, lagDays, createdBy, createdAt
- Maintain `ScheduleBaseline` as versioned snapshot per ProjectBaseline
- Implement scheduling engine service `src/lib/services/scheduler.ts` that can:
  - Compute CPM (early start/finish, late start/finish, total float)
  - Recompute plan dates with dependencies and resource constraints (basic leveling)
  - Evaluate impacts of schedule changes on downstream activities and create impact reports
- Integrate stoppages into actual/forecast calculations

API and workflow changes
- When ScheduleChangeRequest approved: create new ScheduleBaseline or update planned dates and recalc impacts. Record approval as SignOff and create AuditLog entries for baseline updates.
- Provide endpoints to request dependency changes, view impact analysis, and accept/reject.

Verification
- Unit tests for scheduler engine producing known CPM outputs for sample DAGs
- Integration tests for change request approval leading to baseline creation and impact report

Priority
- Dependency model & scheduler engine: high
- Baseline versioning & approval enforcement: high

