# Project Creation and Project Foundation — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §6.2 (Initiating a project), ISO 10006:2017 §5.2 (Initiation and project charter), ISO 9001:2015 §8.2.3 (Review of requirements).
- **Principle**: A project must be formally initiated through documented chartering and authorization. Project objectives, scope boundaries, executive sign-off, stakeholder roles, and measurable acceptance criteria must be recorded before project execution is authorized.

## 2. Where it Applies to Project Management
Applies at project initiation and chartering: when a project transitions from a won tender / bid proposal into an active, legally binding construction project.

## 3. What the Current Code Does
- `src/lib/services/project.service.ts` contains `createProject()`, which currently throws a `DomainError("Projects must be created from a won tender approved by the General Manager", 409)` to enforce tender conversion.
- `prisma/schema.prisma` contains the `Project` model storing basic metadata (`code`, `name`, `projectType`, `contractorOrgId`, `clientOrgId`, `consultantOrgId`, `contractValue`, `contractType`, `plannedStartDate`, `plannedEndDate`, `status`).
- Tenders are stored in `BidTender` model and can undergo conversion when approved by `GENERAL_MANAGER`.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model Project`, `model BidTender`, `model CompanyApproval`, `model Organization`, `model ProjectMembership`)
- `src/lib/services/project.service.ts`
- `src/lib/services/tender.service.ts`
- `src/lib/services/company-approval.service.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/tenders/[id]/convert/route.ts`

## 5. Compliance Status
**Partially Compliant**

## 6. Exact Gap
1. The `Project` schema lacks explicit structured records for **Project Objectives**, **Measurable KPIs / Acceptance Criteria**, and **Project Governance Charter**.
2. No automatic creation of a baseline snapshot (`ProjectBaseline`) upon project initiation approval.
3. `ProjectMembership.projectRole` is a free text string rather than an enumerated `ProjectRole`.

## 7. Why the Gap Matters
Without structured project objectives and initial baseline snapshots, project controls cannot evaluate whether the project delivered its intended scope, budget, and quality benchmarks. Free-text project roles lead to RBAC ambiguity during authorization checks.

## 8. Required Architectural / Design Change
- Implement a formal **Tender-to-Project Conversion Engine**: Converting a won tender creates a `Project`, copies BOQ items into root WBS/BOQ nodes, records `ProjectObjective` records, and freezes the initial `ProjectBaseline` snapshot (Scope, Budget, Schedule).
- Enforce strict state machine transitions for `Project.status` (`PLANNING` $\rightarrow$ `ACTIVE` $\rightarrow$ `SUSPENDED` $\rightarrow$ `CLOSED`).

## 9. Required Database Change
Add the following models and relations in `prisma/schema.prisma`:
```prisma
model ProjectObjective {
  id          String   @id @default(cuid())
  projectId   String
  description String
  metric      String
  targetValue Decimal  @db.Decimal(18, 2)
  targetDate  DateTime
  createdById String
  createdAt   DateTime @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy User    @relation(fields: [createdById], references: [id])

  @@index([projectId])
}

enum BaselineType {
  SCOPE
  SCHEDULE
  COST
  INTEGRATED
}

model ProjectBaseline {
  id           String       @id @default(cuid())
  projectId    String
  version      Int          @default(1)
  type         BaselineType @default(INTEGRATED)
  snapshot     Json
  createdById  String
  approvedById String?
  approvedAt   DateTime?
  createdAt    DateTime     @default(now())

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy  User    @relation("BaselineCreatedBy", fields: [createdById], references: [id])
  approvedBy User?   @relation("BaselineApprovedBy", fields: [approvedById], references: [id])

  @@unique([projectId, version])
  @@index([projectId, type])
}
```

## 10. Required Backend / API Change
- Update `src/lib/services/project.service.ts` to support `createProjectFromTender()`, `addProjectObjective()`, and `createInitialBaseline()`.
- Expose endpoints:
  - `POST /api/projects/:id/objectives`
  - `GET /api/projects/:id/baselines`
  - `POST /api/projects/:id/baselines`

## 11. Required Frontend / UI Change
- Enhance project workspace charter tab with an **Objectives & Baseline Governance** card.
- Add UI modal for General Manager / Senior PM to inspect and freeze initial project baselines.

## 12. Required Workflow Change
1. Tender marked `WON` in `BidTender`.
2. `HEAD_TENDERING` requests project conversion $\rightarrow$ `CompanyApproval` created (`type: PROJECT_CREATION`).
3. `GENERAL_MANAGER` approves request.
4. System executes transaction: creates `Project`, initializes default WBS, sets `status: PLANNING`, and captures initial `ProjectBaseline` (v1).

## 13. Dependencies
- Tender management service (`src/lib/services/tender.service.ts`).
- Company approval service (`src/lib/services/company-approval.service.ts`).

## 14. Implementation Priority
**High (Phase 2)**

## 15. Acceptance / Verification Criteria
- `Project` creation is blocked unless initiated from an approved won tender or executed by `GENERAL_MANAGER` / `ADMIN`.
- Moving a project from `PLANNING` to `ACTIVE` requires an approved `ProjectBaseline` snapshot in the database.
- Audit log records pre/post state changes during project chartering.
