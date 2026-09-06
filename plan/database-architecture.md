# Database Architecture — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO/IEC 25010:2011 (Data quality & relational integrity), ISO 9001:2015 §7.5.3 (Control of documented information), ISO/IEC 27001:2022 A.8.10 (Information deletion & historical record preservation).
- **Principle**: The database schema must enforce referential integrity, support versioned historical baselines, preserve immutable audit trails, and prevent data corruption across all project management domains.

## 2. Where it Applies to Project Management
Applies to the entire PostgreSQL database schema managed via Prisma ORM (`prisma/schema.prisma`), covering all 14 project management domains.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements a 14-domain relational data model with PostgreSQL datasource and Prisma Client output.
- All primary foreign keys maintain index coverage (`@@index`) and cascade deletion rules where appropriate (`onDelete: Cascade`).
- Includes `AuditLog` table with `diff Json?` and `changedAt DateTime @default(now())`.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/lib/services/audit.ts`
- `prisma/migrations/*`

## 5. Compliance Status
**Fully Aligned (Relational Architecture)** / **Partially Compliant (Baseline Versioning & Audit Diff Format)**

## 6. Exact Gap
1. Lacks structured entities for `ProjectObjective`, `ProjectStatusHistory`, and versioned `ProjectBaseline` snapshotting.
2. `AuditLog.diff` lacks a mandated standardized schema payload (`{ before: Json | null, after: Json | null }`) across all mutation services.
3. High-volume time-series tables (`AuditLog`, `LaborAttendance`, `EquipmentUsageLog`) lack partitioning strategies or automated archival policies.

## 7. Why the Gap Matters
Without versioned baseline entities in the schema, updating project parameters overwrites historical baselines, destroying the ability to perform Earned Value Analysis ($EVM$). Unstandardized audit diffs impair automated security auditing and compliance verification.

## 8. Required Architectural / Design Change
- Add baseline versioning models (`ProjectBaseline`, `ProjectObjective`, `ProjectStatusHistory`) directly into `prisma/schema.prisma`.
- Standardize the centralized `logAuditEntry` helper in `src/lib/services/audit.ts` to enforce `{ before, after }` state diff capture across all CRUD endpoints.
- Ensure all `Prisma.Decimal` fields passed from Server Components to Client Components are converted to numbers/strings to prevent React Component serialization errors.

## 9. Required Database Change
Add/update the following model definitions in `prisma/schema.prisma`:
```prisma
model AuditLog {
  id         String      @id @default(cuid())
  entityType String
  entityId   String
  action     AuditAction
  userId     String
  changedAt  DateTime    @default(now())
  /// Standardized JSON schema: { before: Json | null, after: Json | null }
  diff       Json?

  user User @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId])
  @@index([changedAt])
}
```

## 10. Required Backend / API Change
- Update `src/lib/services/audit.ts`:
```typescript
export async function logAuditEntry(params: {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";
  userId: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
}) {
  return db.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      diff: {
        before: params.before ?? null,
        after: params.after ?? null,
      },
    },
  });
}
```

## 11. Required Frontend / UI Change
- Ensure UI data fetching routines transform `Prisma.Decimal` instances using `.toNumber()` or `.toString()` before passing props to Client Components.

## 12. Required Workflow Change
1. All database migrations are performed via `npx prisma migrate dev`.
2. Every mutation service function invokes `logAuditEntry()` with `before` and `after` snapshots.

## 13. Dependencies
- Prisma ORM CLI (`prisma`).
- PostgreSQL database runtime.

## 14. Implementation Priority
**High (Phase 1)**

## 15. Acceptance / Verification Criteria
- `npx prisma validate` passes cleanly with zero schema errors.
- Database migrations execute without errors.
- Every `AuditLog` record contains a valid `{ before, after }` JSON diff object.
