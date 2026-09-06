# Schedule Management — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §7.4 (Schedule management & Critical Path Method - CPM), ISO 10006:2017 §7.4.3 (Schedule control), FIDIC Red Book Sub-Clause 8.3 (Programme of Work).
- **Principle**: The project schedule must model activities, dependencies ($FS, SS, FF, SF$), lag times, and baseline dates. The system must calculate Early Start, Early Finish, Late Start, Late Finish, Total Float, Free Float, and identify the Critical Path. Revising planned activity dates on active projects requires formal schedule change control.

## 2. Where it Applies to Project Management
Applies to project scheduling, Gantt chart generation, critical path identification, delay impact analysis, and schedule variance tracking ($SV = EV - PV$).

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `ScheduleActivity`, `ScheduleDependency` (with `DependencyType`), and `ScheduleChangeRequest`.
- `src/lib/services/schedule.service.ts` provides CRUD operations for schedule activities and dependency relationships.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model ScheduleActivity`, `model ScheduleDependency`, `model ScheduleChangeRequest`)
- `src/lib/services/schedule.service.ts`
- `src/lib/schedule-status.ts`
- `src/app/api/projects/[id]/schedule/route.ts`

## 5. Compliance Status
**Partially Compliant**

## 6. Exact Gap
1. Lacks an in-memory Critical Path Method (CPM) solver to calculate Early/Late dates, Total Float, Free Float, and flag critical path activities (`isCritical`).
2. Allowing direct modification of planned activity dates on active projects without enforcing a formal `ScheduleChangeRequest` workflow violates schedule change control guidelines.

## 7. Why the Gap Matters
Without CPM calculation, project managers cannot identify critical activities whose delay will push back the project completion date. Modifying dates without change control destroys baseline traceability and violates FIDIC Sub-Clause 8.3 requirements.

## 8. Required Architectural / Design Change
- Implement a topological CPM solver module in `src/lib/cpm-solver.ts` that calculates ES, EF, LS, LF, Total Float, Free Float, and `isCritical`.
- Require `ScheduleChangeRequest` approval before updating planned activity dates when `Project.status == "ACTIVE"`.

## 9. Required Database Change
- Existing `ScheduleActivity`, `ScheduleDependency`, and `ScheduleChangeRequest` models are fully aligned.
- Computed CPM values (`totalFloat`, `isCritical`) are derived dynamically by `cpm-solver.ts`.

## 10. Required Backend / API Change
- Add `calculateCriticalPath(projectId)` in `src/lib/cpm-solver.ts`.
- Update `src/lib/services/schedule.service.ts` to enrich schedule responses with calculated float values and critical path flags.
- Reject direct updates to `plannedStart`/`plannedFinish` on active projects unless performed through an approved `ScheduleChangeRequest`.

## 11. Required Frontend / UI Change
- Update Gantt chart component (`src/components/projects/gantt-view.tsx`) to highlight critical path activities in red.
- Render Total Float indicators and allow submitting/reviewing `ScheduleChangeRequest` items.

## 12. Required Workflow Change
1. Planning Officer / PM defines activities and dependencies.
2. System runs CPM solver to calculate floats and highlight critical path.
3. On active projects, date change attempts prompt creation of a `ScheduleChangeRequest` $\rightarrow$ requires Senior PM / Head of Planning approval.

## 13. Dependencies
- WBS service (`project.service.ts`).
- Audit logging (`audit.ts`).

## 14. Implementation Priority
**High (Phase 5)**

## 15. Acceptance / Verification Criteria
- Topological CPM solver correctly identifies critical path activities and calculates zero total float on critical paths.
- Modifying planned dates on an active project without an approved `ScheduleChangeRequest` returns a HTTP 403 error.
- Unit tests in `cpm-solver.test.ts` verify CPM float math across FS/SS/FF/SF dependencies.
