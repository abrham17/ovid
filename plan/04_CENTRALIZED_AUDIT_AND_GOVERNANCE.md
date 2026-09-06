# 04. Centralized Audit Engine & Governance Architecture

## Executive Summary
In compliance with **ISO 9001 §7.5.3 (Control of Documented Information)** and **ISO 10006 §7.8 (Control Changes)**, all data modifications—including record creations, state updates, document supersessions, financial adjustments, and record deletions—must be tracked immutably.

This document specifies the design of a **centralized, reason-focused audit engine** that records every CRUD operation into an IT & Admin department governance log.

---

## 1. Audit Log Schema & Extension Architecture

The `AuditLog` table serves as the single source of truth for system-wide activity auditing.

### Expanded `AuditLog` Model Design

```prisma
model AuditLog {
  id           String      @id @default(cuid())
  entityType   String      // e.g., "Project", "Contract", "VariationOrder", "MeasurementEntry"
  entityId     String      // Unique identifier of the modified record
  action       AuditAction // CREATE | UPDATE | DELETE | APPROVE | REJECT
  userId       String      // Actor who performed the operation
  userRole     UserRole    // Role at the time of operation
  projectId    String?     // Associated project (if applicable)
  reason       String?     // Mandatory rationale for financial/status changes
  diff         Json?       // Structured object containing { before: ..., after: ... }
  ipAddress    String?     // Client IP address
  userAgent    String?     // Browser / Client string
  changedAt    DateTime    @default(now())

  user    User     @relation(fields: [userId], references: [id])
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([userId])
  @@index([projectId])
  @@index([changedAt])
  @@index([action])
}
```

---

## 2. Universal Prisma Extension Implementation

To guarantee that **no CRUD operation bypasses audit logging**, a Prisma Client Extension interceptor (`auditExtension`) is configured at the database client initialization layer in `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient().$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        await recordAuditLog({
          entityType: model,
          entityId: result.id,
          action: 'CREATE',
          diff: { after: result },
        });
        return result;
      },
      async update({ model, args, query }) {
        const before = await (db as any)[model].findUnique({ where: args.where });
        const result = await query(args);
        await recordAuditLog({
          entityType: model,
          entityId: result.id,
          action: 'UPDATE',
          diff: { before, after: result },
          reason: args.data?.auditReason || null,
        });
        return result;
      },
      async delete({ model, args, query }) {
        const before = await (db as any)[model].findUnique({ where: args.where });
        const result = await query(args);
        await recordAuditLog({
          entityType: model,
          entityId: before.id,
          action: 'DELETE',
          diff: { before },
          reason: args?.auditReason || null,
        });
        return result;
      },
    },
  },
});
```

---

## 3. Mandatory Rationale & Reason Enforcement

Under ISO change control standards, critical system operations **MUST require a typed justification reason** before execution.

### Operations Requiring Mandatory Rationale
1. **Contract & Financial Operations**:
   - Creating or modifying a `VariationOrder` cost impact.
   - Adjusting a `BoqItem` unit rate or budgeted quantity.
   - Overriding a `MeasurementEntry` certified quantity.
2. **Planning & Schedule Operations**:
   - Updating a `ScheduleActivity` baseline start/finish date.
   - Modifying dependency lag or logic between activities.
   - Resolving or closing a `StoppageEntry`.
3. **Quality & Safety Operations**:
   - Marking a `SafetyIncident` or `DefectLog` as verified closed.
   - Overriding an `InspectionTestRecord` (ITR) result from FAIL to CONDITIONAL_PASS.
4. **Administrative & Governance Operations**:
   - Changing a `User` role or active status.
   - Modifying `ProjectMembership` rights.

If a server action attempts a restricted operation without providing `reason` (minimum 15 characters), the server action aborts with an `AUDIT_REASON_REQUIRED` error.

---

## 4. IT & Admin Department Audit Log Inspector Dashboard

The IT Department and General Managers access a dedicated real-time **Audit Inspector Dashboard** (`/admin/audit-logs`) with advanced filtering capabilities:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      IT & ADMIN AUDIT LOG INSPECTOR                      │
├─────────────┬─────────────┬──────────────┬──────────────┬────────────────┤
│ Date/Time   │ Actor / Role│ Entity/Domain│ Action       │ Rationale      │
├─────────────┼─────────────┼──────────────┼──────────────┼────────────────┤
│ 10:42 AM    │ Bekele (QS) │ BoqItem      │ UPDATE       │ "Adjusted per  │
│             │             │              │ (Rate Edit)  │ Vo #3 approval"│
├─────────────┼─────────────┼──────────────┼──────────────┼────────────────┤
│ 09:15 AM    │ GM (Exec)   │ Variation    │ APPROVE      │ "Approved per  │
│             │             │              │              │ site site visit"│
└─────────────┴─────────────┴──────────────┴──────────────┴────────────────┘
```

### Dashboard Features
1. **Side-by-Side Diff Viewer**: Click any row to view full JSON side-by-side comparison (`before` vs `after`) with highlighted value changes.
2. **Actor Traceability**: Click any actor name to view complete chronological activity history across all projects.
3. **Export & ISO Compliance Reports**: One-click generation of PDF/Excel audit reports for ISO 9001 external auditors.
