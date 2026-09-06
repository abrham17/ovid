# Quality and Compliance Controls — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 9001:2015 §8.6 (Release of products and services), §8.7 (Control of nonconforming outputs), ISO 10006:2017 §7.3 (Quality management in project processes).
- **Principle**: Work activities cannot be certified complete or progressed without passing mandatory Inspection and Test Records ($ITRs$). Nonconformities ($Defects$) must be logged, assigned responsible parties, re-inspected, and closed. WBS node completion must be gated by 100% passed ITRs and zero open critical defects.

## 2. Where it Applies to Project Management
Applies to site quality inspections, concrete pour approvals, rebar placement verification, defect logs, punch list items, and quality release gates.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `InspectionTestRecord` (`result: PASS | FAIL | CONDITIONAL_PASS`), `DefectLog` (`status: OPEN | REWORK_IN_PROGRESS | VERIFIED_CLOSED`), and `PunchListItem`.
- `src/lib/services/quality.service.ts` provides inspection, defect, and punch list management workflows.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model InspectionTestRecord`, `model DefectLog`, `model PunchListItem`, `model DisputeRecord`)
- `src/lib/services/quality.service.ts`
- `src/app/api/projects/[id]/quality/route.ts`

## 5. Compliance Status
**Fully Aligned (Quality Data Model)** / **Partially Compliant (Quality Gate Enforcement)**

## 6. Exact Gap
1. Updating a WBS activity to `COMPLETE` in `schedule.service.ts` does not check whether linked mandatory `InspectionTestRecord` entries passed or whether open `DefectLog` items remain unresolved.
2. Defect log entries do not automatically block linked payment IPC measurement entries until verified closed by `QC_INSPECTOR` or `CONSULTANT_ENGINEER`.

## 7. Why the Gap Matters
Allowing activities with failed inspections or open defects to be marked complete and certified for payment violates ISO 9001 quality release controls and Ethiopian Grade-1 contractual requirements.

## 8. Required Architectural / Design Change
- Implement a **Quality Release Gate** function in `src/lib/services/quality.service.ts` (`assertQualityGatePassed(wbsNodeId)`).
- Gate activity completion and IPC payment certification on zero open defects and 100% passed ITRs.

## 9. Required Database Change
- Existing `InspectionTestRecord`, `DefectLog`, and `PunchListItem` models in `prisma/schema.prisma` are fully aligned.

## 10. Required Backend / API Change
- Update `updateActivityStatus()` in `src/lib/services/schedule.service.ts`:
```typescript
if (targetStatus === "COMPLETE") {
  await assertQualityGatePassed(activity.wbsNodeId);
}
```
- Update `certifyMeasurement()` in `src/lib/services/cost.service.ts` to verify zero open defects exist on the measured WBS node.

## 11. Required Frontend / UI Change
- Update quality workspace view (`src/components/projects/quality-tab.tsx`) with a **Quality Gate Checklist Indicator** (Passed ITRs count / Open Defects count).
- Display warning banner when quality defects block activity completion.

## 12. Required Workflow Change
1. QC Inspector performs site inspection $\rightarrow$ records `InspectionTestRecord`.
2. If `FAIL`, system creates `DefectLog` (`status: OPEN`) $\rightarrow$ blocks activity completion.
3. Contractor completes rework $\rightarrow$ QC Inspector re-inspects $\rightarrow$ marks defect `VERIFIED_CLOSED`.
4. Quality gate clears $\rightarrow$ activity can be marked `COMPLETE`.

## 13. Dependencies
- Schedule service (`schedule.service.ts`).
- Measurement / Cost service (`cost.service.ts`).

## 14. Implementation Priority
**High (Phase 6)**

## 15. Acceptance / Verification Criteria
- Marking an activity `COMPLETE` while an open `DefectLog` exists on its WBS node throws a HTTP 422 error.
- QC Inspectors can verify and close defects with signature images logged in `SignOff`.
