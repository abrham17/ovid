# 05. Codebase Refactoring & Implementation Technical Roadmap

## Executive Overview
This technical roadmap translates the ISO gap analysis, physical progress formulas, expanded RBAC hierarchy, and centralized audit requirements into actionable code modification tasks across the Next.js / Prisma codebase.

---

## Task Breakdown & Engineering Specifications

### Phase 1: Database Schema Refactoring (`prisma/schema.prisma`)
1. **Expand `UserRole` Enum**:
   - Add `GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, `IT_ADMIN`, `CONTRACTS_MANAGER`, `PROCUREMENT_MANAGER`, `EQUIPMENT_MANAGER`, `HR_MANAGER`, `SAFETY_DIRECTOR`, `SUBCONTRACTOR_PM`, `SUBCONTRACTOR_REP`, `SUPPLIER_REP`, `REGULATOR_INSPECTOR`.
2. **Expand `AuditLog` Model**:
   - Add `userRole` (`UserRole`), `projectId` (`String?`), `reason` (`String?`), `ipAddress` (`String?`), `userAgent` (`String?`).
3. **Add FIDIC Contract Claims & Subcontract Models**:
   - Create `ContractClaim` model with fields: `id`, `contractId`, `claimNo`, `causeOfClaim`, `noticeDate`, `financialClaimAmount`, `timeExtensionDays`, `status` (DRAFT, NOTIFIED, CONSULTANT_REVIEW, APPROVED, REJECTED).
   - Create `SubcontractAgreement` model to link subcontractor organizations to specific main contract scopes and WBS branches.
4. **Add Equipment Operational & Maintenance Models**:
   - Create `EquipmentMaintenance` model: `id`, `equipmentId`, `serviceType`, `odometerReading`, `cost`, `performedAt`.
   - Create `FuelLog` model: `id`, `equipmentId`, `litersIssued`, `fuelCost`, `issuedAt`.
5. **Add Departmental Vouchers (SUD / Finance)**:
   - Create `StoreVoucher` model: `id`, `voucherType` (REQUISITION, ISSUE, RETURN, TRANSFER), `projectId`, `requestedByUserId`, `approvedByUserId`, `status`.

---

### Phase 2: Core Business Logic & Progress Calculation Engine
1. **Physical Quantity Calculation Service (`src/lib/services/progress.ts`)**:
   - Implement `calculateLeafWbsProgress(wbsNodeId: string)`:
     - Query approved daily entries (`EarthworkDailyEntry`, `StructureDailyEntry`, `RebarDailyEntry`) and certified IPC `MeasurementEntry` rows.
     - Compare sum against `BoqItem.budgetedQuantity`.
     - Calculate both `uncertifiedProgress` and `certifiedProgress`.
   - Implement `rollupParentWbsProgress(parentWbsNodeId: string)`:
     - Weight child node progress percentages by monetary BOQ value ($V_i = Q_{\text{budgeted}, i} \times \text{UnitRate}_i$).
     - Recursively update parent WBS nodes up to root Level 0 Project node.
2. **Stoppage & Standing Cost Service (`src/lib/services/stoppage.ts`)**:
   - Calculate standing costs automatically when a stoppage is logged using assigned equipment idle hours and labor standby rates.
   - If stoppage duration exceeds activity float, generate an automatic draft `ContractClaim` for Extension of Time (EOT) under FIDIC Clause 8.4.

---

### Phase 3: Centralized Audit Engine & Middleware Infrastructure
1. **Prisma Client Audit Extension (`src/lib/db.ts`)**:
   - Implement universal audit wrapper intercepting mutations.
   - Enforce mandatory `reason` payload validation for sensitive entity updates.
2. **RBAC Middleware Enhancement (`src/lib/rbac.ts`)**:
   - Add bypass policies for C-suite roles (`GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `IT_ADMIN`) allowing global portfolio access across all projects.
   - Restrict `SUBCONTRACTOR_PM` access strictly to assigned subcontract WBS branches.

---

### Phase 4: UI / Dashboard Components & Top Management Views
1. **General Manager Portfolio Executive Dashboard (`src/components/dashboards/executive-dashboard.tsx`)**:
   - Multi-project comparative S-Curve chart (Target vs Actual Physical Progress).
   - Real-time active work stoppages feed with daily financial standing cost counter.
   - FIDIC claims and variation orders pending C-suite approval.
2. **IT & Admin Audit Log Inspector (`src/app/(protected)/admin/audit-logs/page.tsx`)**:
   - Interactive data table with entity filters, user search, date range pickers, and JSON side-by-side diff modal.
3. **Physical Quantity Progress Entry UI (`src/components/projects/wbs-quantity-tracker.tsx`)**:
   - Displays physical unit quantities ($m^3$, $kg$, $m^2$) alongside percentage bars.
   - Clear distinction between "Uncertified Field Progress" (from foremen daily reports) and "Certified IPC Progress" (from resident engineer certificates).

---

## Validation & Verification Criteria

1. **Prisma Migration Integrity**: `npx prisma validate` passes with zero schema errors.
2. **Type Safety**: `npm run build` / `tsc` completes without type errors across all expanded enums and models.
3. **Physical Quantity Testing**: Verify that updating a daily entry for 50 $m^3$ out of 100 $m^3$ budget correctly sets leaf progress to 50% and accurately weights parent roll-up.
4. **Audit Trail Completeness**: Confirm every database mutation produces an immutable `AuditLog` row containing user ID, role, action, and JSON diff.
