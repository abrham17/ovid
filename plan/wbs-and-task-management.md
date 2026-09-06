# Work Breakdown Structure (WBS) and Task Management — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 10006:2017 §5.2.3 (WBS decomposition), ISO 21502:2020 §7.2 (Scope breakdown & 100% Rule), ISO 9001:2015 §8.5.1 (Control of work execution).
- **Principle**: The WBS must represent 100% of the project work scope through hierarchical decomposition. Sibling nodes must sum to 100% weight of their parent node. Subcontractor scope plans must remain isolated in `DRAFT` state until formally approved by the main contractor.

## 2. Where it Applies to Project Management
Applies to project planning, scope decomposition, subcontractor onboarding, WBS tree creation, activity assignment, and physical progress weighting.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `WbsNode` with `weightPercent Decimal? @db.Decimal(7, 4)`, `planSubmissionId String?`, and `status WbsNodeStatus @default(ACTIVE)`.
- `WbsPlanSubmission` tracks subcontractor branch decompositions (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`).
- `src/lib/weight-math.ts` computes recursive weighted progress rollups.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model WbsNode`, `model WbsPlanSubmission`, `model ScheduleActivity`)
- `src/lib/weight-math.ts`
- `src/lib/services/project.service.ts`
- `src/lib/services/wbs-plan.service.ts`
- `src/app/api/projects/[id]/wbs/route.ts`

## 5. Compliance Status
**Fully Aligned (WBS Weight Architecture & Subcontractor Isolation)**

## 6. Exact Gap
1. While weighting math is implemented, the API routes lack an automated validation check ensuring sibling weights sum to exactly 100.00% before approving a `WbsPlanSubmission`.
2. No explicit baseline versioning table (`WbsBaseline`) preserving past WBS tree hierarchies when scope changes occur.

## 7. Why the Gap Matters
If sibling nodes sum to less or more than 100%, progress rollups become mathematically distorted ($>100\%$ or $<100\%$ maximum project progress), violating ISO 21502 100% rule requirements.

## 8. Required Architectural / Design Change
- Implement a recursive 100%-Rule validator in `src/lib/weight-math.ts` (`validateWbsTreeWeights(nodes)`).
- Gate `WbsPlanSubmission` approval in `src/lib/services/wbs-plan.service.ts` on zero weight validation errors.
- Freeze WBS structure in `ProjectBaseline` when project moves to `ACTIVE`.

## 9. Required Database Change
- Existing `WbsNode` and `WbsPlanSubmission` schema models are fully aligned.
- Baseline snapshot JSON inside `ProjectBaseline` captures full WBS node hierarchy and weight allocations.

## 10. Required Backend / API Change
- Update `src/lib/services/wbs-plan.service.ts`:
  - Enforce `validateWbsTreeWeights()` during `submitWbsPlan()` and `approveWbsPlan()`.
  - On `approveWbsPlan()`, transition all submission nodes from `DRAFT` to `ACTIVE`.

## 11. Required Frontend / UI Change
- Enhance WBS tree view UI (`src/components/projects/wbs-view.tsx`) with a **Weight Distribution Helper** showing parent node weight balance.
- Display warning badges when sibling weights do not sum to 100%.

## 12. Required Workflow Change
1. Subcontractor PM creates WBS nodes under an open `WbsPlanSubmission` $\rightarrow$ status is `DRAFT`.
2. Subcontractor submits plan for review.
3. System validates recursive 100% weight rule.
4. Main Contractor PM approves submission $\rightarrow$ nodes transition to `ACTIVE` and enter the live progress rollup engine.

## 13. Dependencies
- Weight math engine (`src/lib/weight-math.ts`).
- Scope authorization helper (`src/lib/scope.ts`).

## 14. Implementation Priority
**High (Phase 3)**

## 15. Acceptance / Verification Criteria
- Subcontractor WBS nodes in `DRAFT` status are excluded from live project progress calculations.
- Attempting to approve a `WbsPlanSubmission` whose sibling weights sum to 95% returns a HTTP 400 validation error.
- Unit tests in `weight-math.test.ts` verify 100% rule compliance.
