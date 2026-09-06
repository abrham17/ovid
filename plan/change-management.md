# Integrated Change Management — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §7.10 (Change control), ISO 10006:2017 §5.2.4 (Control of scope changes), FIDIC Red Book Sub-Clause 13.1–13.3 (Variations & Adjustments).
- **Principle**: Any change affecting project scope, schedule, cost, or technical specifications must undergo formal impact analysis (cost impact, delay impact), documented multi-tiered approval, versioned baseline adjustments, and complete audit logging.

## 2. Where it Applies to Project Management
Applies to variation orders (VOs), contract scope amendments, schedule timeline revisions, BOQ unit rate adjustments, and baseline re-benchmarking.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `VariationOrder` (`costImpact`, `timeImpactDays`, `status`), `ScheduleChangeRequest`, and `CompanyApproval`.
- `src/lib/services/contract.service.ts` and `wbs-plan.service.ts` handle contract and variation processing.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model VariationOrder`, `model ScheduleChangeRequest`, `model CompanyApproval`)
- `src/lib/services/contract.service.ts`
- `src/lib/services/company-approval.service.ts`
- `src/app/api/projects/[id]/variations/route.ts`

## 5. Compliance Status
**Fully Aligned (Variation Order Lifecycle)** / **Partially Compliant (Automatic Baseline Versioning)**

## 6. Exact Gap
1. When a high-value `VariationOrder` is approved by `GENERAL_MANAGER` or `CONSULTANT_APPROVED`, the system does not automatically generate a new versioned `ProjectBaseline` snapshot incorporating the updated scope and contract value.
2. No explicit field linking a `VariationOrder` directly to a `ScheduleChangeRequest` to enforce concurrent cost-and-schedule impact analysis.

## 7. Why the Gap Matters
Approving cost variations without updating schedule baselines distorts Earned Value Analysis ($EVM$), causing artificial schedule variance anomalies.

## 8. Required Architectural / Design Change
- Link `VariationOrder` and `ScheduleChangeRequest` through a foreign key relation or shared change package identifier.
- Trigger automatic creation of a new `ProjectBaseline` version when a major variation is approved.

## 9. Required Database Change
Update `model VariationOrder` in `prisma/schema.prisma`:
```prisma
model VariationOrder {
  id                     String                 @id @default(cuid())
  projectId              String
  wbsNodeId              String?
  linkedScheduleChangeId String?                @unique
  itemNo                 String
  workDescription        String
  costImpact             Decimal?               @db.Decimal(18, 2)
  timeImpactDays         Int?
  status                 VariationOrderStatus   @default(DRAFT)
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt

  project        Project                @relation(fields: [projectId], references: [id], onDelete: Cascade)
  wbsNode        WbsNode?               @relation(fields: [wbsNodeId], references: [id])
  scheduleChange ScheduleChangeRequest? @relation(fields: [linkedScheduleChangeId], references: [id])

  @@index([projectId])
}
```

## 10. Required Backend / API Change
- Update `approveVariationOrder()` in `src/lib/services/contract.service.ts`:
  - Recalculate total `Project.contractValue`.
  - Create new `ProjectBaseline` version snapshot capturing updated BOQ and schedule baselines.
  - Record audit diff via `logAuditEntry()`.

## 11. Required Frontend / UI Change
- Update Variation Order form (`src/components/projects/variations-tab.tsx`) to allow attaching a linked `ScheduleChangeRequest` for joint approval.

## 12. Required Workflow Change
1. Contractor prepares `VariationOrder` with cost and time impact.
2. Consultant checks $\rightarrow$ General Manager / Client Rep approves.
3. System executes atomic transaction: updates contract value, approves linked schedule change, creates new `ProjectBaseline` snapshot, and logs audit diff.

## 13. Dependencies
- Baseline snapshot engine (`ProjectBaseline`).
- Audit logger (`audit.ts`).

## 14. Implementation Priority
**High (Phase 7)**

## 15. Acceptance / Verification Criteria
- Approving a variation order automatically creates a new `ProjectBaseline` record with incremented version number.
- `GET /api/projects/:id/baselines` reflects total updated contract value and schedule baseline.
