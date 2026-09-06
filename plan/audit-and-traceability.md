# Auditability and Traceability — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO/IEC 27001:2022 A.8.15 (Logging & monitoring), ISO 9001:2015 §8.5.2 (Identification & traceability), ISO/IEC 27034 (Application security controls).
- **Principle**: The system must provide complete, tamper-evident auditability for every data mutation across all domains. Every update, deletion, approval, or status change must record: Who executed it, When, Which entity, Under whose authority, and What changed (capturing exact `before` and `after` JSON state snapshots).

## 2. Where it Applies to Project Management
Applies to all 14 schema domains, REST endpoints, backend service mutations, status transitions, financial calculations, user role modifications, and administrative settings.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `model AuditLog { id, entityType, entityId, action, userId, changedAt, diff Json? }`.
- `src/lib/services/audit.ts` provides centralized `logAuditEntry()` helper function.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model AuditLog`, `enum AuditAction`)
- `src/lib/services/audit.ts`
- `src/app/api/audit-logs/route.ts` (or query endpoints)

## 5. Compliance Status
**Fully Aligned (Audit Data Model)** / **Partially Compliant (Universal Mutation Snapshot Capture)**

## 6. Exact Gap
1. While `logAuditEntry()` exists, not all CRUD service functions in `src/lib/services/*` consistently pre-fetch the existing record (`before`) prior to executing mutations to record explicit `{ before, after }` state diffs.
2. Lacks a dedicated, RBAC-protected API route (`GET /api/audit-logs`) and frontend UI component for compliance officers to inspect entity audit trails.

## 7. Why the Gap Matters
Without pre/post mutation snapshots across every service function, compliance officers cannot reconstruct historical contract parameters, site entries, or financial measurements prior to an unauthorized modification.

## 8. Required Architectural / Design Change
- Standardize `AuditLog.diff` payload structure across all service operations:
```json
{
  "before": { "contractValue": 500000.00, "status": "DRAFT" },
  "after": { "contractValue": 650000.00, "status": "ACTIVE" }
}
```
- Wrap every Prisma update/delete operation with pre-fetch and post-commit audit logging.

## 9. Required Database Change
- Existing `AuditLog` model in `prisma/schema.prisma` is fully aligned and indexed by `(entityType, entityId)`, `userId`, and `changedAt`.

## 10. Required Backend / API Change
- Update `src/lib/services/audit.ts` to export `getAuditTrail(entityType, entityId, opts)` with pagination and filtering.
- Expose endpoint `GET /api/audit-logs` restricted to `INTERNAL_AUDITOR`, `GENERAL_MANAGER`, and `ADMIN`.

## 11. Required Frontend / UI Change
- Build an **Audit Log Inspector Component** (`src/components/audit/audit-log-modal.tsx`) rendering side-by-side JSON diffs (`before` vs `after` highlight).

## 12. Required Workflow Change
1. API route receives mutation request.
2. Service pre-fetches existing row (`before`).
3. Database mutation executes.
4. Service invokes `logAuditEntry({ entityType, entityId, action, userId, before, after })`.

## 13. Dependencies
- Prisma ORM transactions.
- Session user context (`src/lib/auth.ts`).

## 14. Implementation Priority
**High (Phase 1)**

## 15. Acceptance / Verification Criteria
- Modifying any project, WBS node, daily report, IPC measurement, or contract generates an `AuditLog` entry containing valid `before` and `after` JSON snapshots.
- `GET /api/audit-logs?entityType=Project&entityId=clx...` returns complete chronological audit history.
