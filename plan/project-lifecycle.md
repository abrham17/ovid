# Project Lifecycle — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §6 (Project lifecycle management), ISO 10006:2017 §5.2 (Initiation to closure processes), ISO 9001:2015 §8.5 (Control of production and service provision).
- **Principle**: A project lifecycle must progress through distinct, governed phases (`PLANNING` $\rightarrow$ `ACTIVE` $\rightarrow$ `SUSPENDED` $\rightarrow$ `COMPLETE` $\rightarrow$ `CLOSED`). Each phase transition requires formal gate reviews, entry/exit criteria verification, and documented authority sign-offs.

## 2. Where it Applies to Project Management
Applies across the complete lifecycle of a construction project from initial chartering through design, execution, defects notification period (DNP), and final contractual handover.

## 3. What the Current Code Does
- `prisma/schema.prisma` defines `enum ProjectStatus { PLANNING, ACTIVE, SUSPENDED, COMPLETE, CLOSED }`.
- `src/lib/services/project.service.ts` allows updating project status via generic `updateProject()`, without enforcing phase gate checks or entry/exit criteria.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`enum ProjectStatus`, `model Project`, `model ProjectBaseline`, `model CompanyApproval`)
- `src/lib/services/project.service.ts`
- `src/lib/services/audit.ts`
- `src/app/api/projects/[id]/route.ts`

## 5. Compliance Status
**Partially Compliant**

## 6. Exact Gap
1. Status transitions are unconstrained: a project can move from `PLANNING` to `ACTIVE` without an approved `ProjectBaseline` or signed contract.
2. A project can be moved to `COMPLETE` or `CLOSED` even if there are unresolved `DefectLog` items, uncertified IPC measurements, or open `SafetyIncident` cases.
3. No historical audit model recording phase transition justifications, gate review evidence, or approver signatures.

## 7. Why the Gap Matters
Uncontrolled phase transitions undermine governance. Moving to `ACTIVE` without a baseline prevents schedule and cost variance tracking ($SV, CV, EVM$). Closing a project without resolving defect/safety logs exposes the contractor to unmitigated legal and financial liabilities.

## 8. Required Architectural / Design Change
Implement a **Phase Gate Transition Engine** in `src/lib/services/project.service.ts`:
- Define explicit preconditions for each status transition.
- Require formal `CompanyApproval` or explicit executive authorization for critical transitions (`PLANNING` $\rightarrow$ `ACTIVE`, `COMPLETE` $\rightarrow$ `CLOSED`).

## 9. Required Database Change
Add `model ProjectStatusHistory` in `prisma/schema.prisma`:
```prisma
model ProjectStatusHistory {
  id              String        @id @default(cuid())
  projectId       String
  fromStatus      ProjectStatus
  toStatus        ProjectStatus
  reason          String
  gateEvidenceRef String?
  changedById     String
  changedAt       DateTime      @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  changedBy User    @relation(fields: [changedById], references: [id])

  @@index([projectId, changedAt])
}
```

## 10. Required Backend / API Change
- Add `transitionProjectStatus(user, projectId, targetStatus, reason)` to `src/lib/services/project.service.ts`.
- Enforce the following gate checks:
  - `PLANNING` $\rightarrow$ `ACTIVE`: Must have an approved `ProjectBaseline` (v1) and an active `Contract`.
  - `ACTIVE` $\rightarrow$ `COMPLETE`: All WBS leaf activities must be `COMPLETE`, zero `OPEN` `DefectLog` items, zero `OPEN` `SafetyIncident` cases, and 100% passed critical ITRs.
  - `COMPLETE` $\rightarrow$ `CLOSED`: Final IPC paid, contract retention released, and executive sign-off (`GENERAL_MANAGER` or `MANAGING_DIRECTOR`).
- Expose endpoint `POST /api/projects/:id/transition`.

## 11. Required Frontend / UI Change
- Replace generic status dropdown in project settings with a **Lifecycle Phase Gate Stepper**.
- Display gate check results (green checkmarks / red blockers) prior to enabling phase transition buttons.

## 12. Required Workflow Change
1. PM clicks "Request Activation".
2. System runs automated gate check (Baseline exists? Active Contract exists?).
3. If criteria pass, transition to `ACTIVE` is recorded in `ProjectStatusHistory` and logged via `src/lib/services/audit.ts`.

## 13. Dependencies
- Audit service (`src/lib/services/audit.ts`).
- Baseline engine (`ProjectBaseline`).
- Quality and HSE services (`quality.service.ts`, `safety.service.ts`).

## 14. Implementation Priority
**High (Phase 2)**

## 15. Acceptance / Verification Criteria
- Attempting to transition a project to `ACTIVE` without a baseline returns a HTTP 422 error with specific gate failure details.
- Every status transition creates an immutable `ProjectStatusHistory` record and `AuditLog` entry.
