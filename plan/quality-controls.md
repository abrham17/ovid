# Quality controls — analysis and plan

Relevant models
- InspectionTestRecord (ITR), DefectLog, PunchListItem, DesignReview, AuditFinding

Gaps
1. ITRs have statuses but no enforced linkage to ScheduleActivity/WbsNode/Measurement/SignOff to verify completed work tied to quality acceptance.
2. Defect lifecycle exists but we must ensure defect verification creates audit trail and ties to completion of rework tasks.
3. No mandatory gating controls preventing activity closure until required ITRs or sign-offs are complete for safety/quality-critical works.

Required changes
- Enforce quality gates: add gating rules to activity completion logic that check required ITRs/signoffs; implement as service `quality-gate.ts` hooked into activity close transitions.
- When Defect is raised against an activity, create rework TaskAssignment automatically and link closure verification to Defect resolution.
- Record required evidence attachments and link to SignOff and AuditLog

Files
- prisma/schema.prisma: ensure ITR has wbsNodeId/activityId and requiredSignoffs Json
- src/lib/services/quality-gate.ts
- API and UI: present outstanding ITRs/defects as blockers before activity closure

Verification
- Tests that attempt to close an activity with pending required ITRs fail; closure succeeds after sign-off

Priority
- Quality gates enforcement: high

