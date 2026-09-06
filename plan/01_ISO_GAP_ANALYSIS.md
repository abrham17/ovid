# 01. ISO Standard vs. Codebase Gap Analysis

## Executive Overview
This document provides a comprehensive gap analysis between the existing Project Management System (PMS) codebase and international ISO standards (**ISO 9001:2015** Quality Management, **ISO 10006:2017** Quality Management in Projects, **ISO 31000** Risk Management, and **ISO 21500** Guidance on Project Management), alongside FIDIC contract forms and Ethiopian Ministry of Urban Development & Construction (MoUDC) Grade-1 Contractor operational standards.

The primary objective is to transform the system from a conventional lightweight web application into a **centrally governed, ISO-certified construction project management platform**.

---

## Departmental & Standard Gap Matrix

| Department / Domain | ISO / Standard Reference | Current Code Base Implementation | Identified Gaps & Weaknesses | Required Architecture Changes |
| :--- | :--- | :--- | :--- | :--- |
| **Contract Operations (COD)** | ISO 10006 §7.3, FIDIC Red/Yellow, MoUDC | Basic `Contract` model with `contractValue` and `retentionPercent`. Subcontracts linked via `parentContractId`. | Missing claim tracking (causes of claim, claim status, financial impact, time extension requests), liquidated damages, delay notifications, and dispute resolution workflows. | Create `ContractClaim` and `SubcontractAgreement` models. Add automated notice timeline triggers under FIDIC Clause 20.1. |
| **Engineering & Design (EAD)** | ISO 9001 §7.5, ISO 10006 §7.4 | Basic `WbsNode` with `designReady` boolean and `ProjectDocument` model. | Lacks formal drawing revision control, transmittal sheets, Request for Information (RFI) workflow, design change order approvals, and shop drawing submission schedules. | Implement `RfiEntry`, `DrawingRevision`, and `Transmittal` models with multi-stage sign-offs (Prepared -> Checked -> Resident Engineer Approved). |
| **Engineering & Group Division (EGD)** | ISO 10006 §7.2, MoUDC Tender/Bid | `BidTender` model with basic status (DRAFT, SUBMITTED, WON, LOST). | Missing retention guarantee tracking, advance payment bond follow-ups, performance bond expirations, contractor all-risk (CAR) insurance monitoring, and tender cost breakdowns. | Expand `Contract` and `BidTender` to track `BondGuarantee` lifecycle, insurance policies, CAR expiration alerts, and retention certificate releases. |
| **Equipment Management (EMD)** | ISO 9001 §7.1.3, Ethiopian Grade-1 | `Equipment`, `EquipmentUsageLog`, and `CustodyLog` models. | Operating/Idle/Down hours logged without fuel consumption ratios, preventive maintenance schedules, breakdown logs, meter/odometer readings, or equipment rental cost rates. | Add `EquipmentMaintenance`, `FuelLog`, and `EquipmentRates` models. Calculate machine efficiency ($OH / (OH + IH + DH)$) automatically. |
| **Finance & Accounting (FAD)** | ISO 9001 §7.1.6, IFRS, ISO 10006 §7.3 | Basic `BoqItem`, `CostActual`, and `MeasurementEntry`. | Lacks Chart of Accounts integration, VAT/Withholding tax certificates, petty cash replenishment tracking, consultant/subcontractor payment certificates, and bank reconciliation entries. | Add `PaymentCertificate`, `PettyCashVoucher`, and `TaxDocument` models. Integrate IPC (Interim Payment Certificate) generation matching MoUDC Grade-1 standard formats. |
| **HR & Administration (HRAD)** | ISO 9001 §7.1.2, ISO 10006 §6.2 | `Employee`, `LaborAttendance`, and `LaborAssignment`. | No skill/competency matrix, safety training records, daily casual labor payroll breakdown (1st/2nd half), severance, or retroactive salary adjustment workflows. | Expand `Employee` to track certifications, safety qualifications, daily casual payroll sheets, and labor cost distribution per WBS node. |
| **Procurement (PRO)** | ISO 9001 §8.4, ISO 10006 §7.7 | `PurchaseOrder`, `PurchaseOrderItem`, `MaterialReceipt`, `MaterialDemand`. | Lacks vendor evaluation rating, purchase requisitions (PR) prior to PO, multi-quote comparisons, material test certificate linkages, and store requisition/issue vouchers. | Introduce `PurchaseRequisition`, `VendorRating`, and `StoreVoucher` models (Store Requisition, Store Issue, Store Return). |
| **Site Usage & Logistics (SUD)** | ISO 9001 §8.5.4, Ethiopian Grade-1 | Basic `CustodyLog` and daily report entries (`EarthworkDailyEntry`, `StructureDailyEntry`, `RebarDailyEntry`). | Lacks anti-theft gate pass vouchers, inter-store transfer vouchers, material quality receiving memos, and borrow pit transport records. | Create `GatePass`, `InterStoreTransfer`, and `BorrowMaterialLog` models. |

---

## Detailed Gap Breakdown

### 1. Project Progress Tracking: Subjective vs. Physical Quantity-Based
* **Current State**: Progress is stored as a `progressPercent` decimal field on `ScheduleActivity` (0-100%). Users can manually overwrite progress percentages without backing physical measurements.
* **ISO Standard Expectation (ISO 10006 §7.3 & ISO 9001 §9.1)**: Progress MUST be calculated **bottom-up** from verified, certified physical quantities completed on site (e.g., $m^3$ of excavation, $m^3$ of concrete poured, $kg$ of rebar placed, $m^2$ of formwork erected) against total BoQ design quantities.
* **Gap Analysis**:
  - Daily site reports (`EarthworkDailyEntry`, `StructureDailyEntry`, `RebarDailyEntry`) record actual daily quantities, but these are isolated from `ScheduleActivity.progressPercent`.
  - Interim Payment Certificates (IPC) and measurement entries (`MeasurementEntry`) are not automatically updating WBS progress.
  - No physical quantity roll-up algorithm exists to calculate parent WBS node completion (Phase, Floor, Section) based on leaf-node physical measurements.

### 2. Roles, Permissions & Executive Oversight (RBAC)
* **Current State**: `UserRole` enum has 16 operational roles, but lacks top-level executive governance roles (e.g. `GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, `IT_ADMIN`).
* **ISO Standard Expectation (ISO 9001 §5.1 Leadership & Top Management)**: Top Management must have direct visibility into quality objectives, risk profiles, project progress, stoppage financial impacts, and operational department efficiency across ALL active projects without requiring project-by-project assignment.
* **Gap Analysis**:
  - `GENERAL_MANAGER` role is missing, causing top executives to be treated as generic `ADMIN` or site-level users.
  - Subcontractor management roles are missing (e.g., `SUBCONTRACTOR_PM`, `SUBCONTRACTOR_REPRESENTATIVE`), preventing external party interaction within the RBAC model.
  - `ProjectMembership` strictly scopes non-admin users to specific projects, preventing General Managers and Department Heads from viewing company-wide portfolios.

### 3. Centralized Audit Trail & IT/Admin Oversight
* **Current State**: An `AuditLog` table exists with `entityType`, `entityId`, `action`, `userId`, `changedAt`, and `diff`. However, audit logging is invoked inconsistently across server actions, and lacks reason/rationale fields for critical updates (e.g., price changes, schedule baseline changes, contract variations).
* **ISO Standard Expectation (ISO 9001 §7.5.3 Control of Documented Information & Traceability)**: Every CRUD operation—especially approvals, status modifications, rate changes, and WBS structure edits—must be recorded immutably with actor, IP/session, previous state, new state, and **mandatory rationale/reason**.
* **Gap Analysis**:
  - No centralized Prisma middleware / extension auto-capturing mutations across all 14+ system domains.
  - IT Department & General Managers do not have a dedicated Audit Log Inspector UI to query modifications by user, domain, or timestamp.
  - Reasons for variations, stoppage logging, and schedule shifts are not enforced at the database/action boundary.

### 4. Work Stoppage, Variation & Delay Impact Analysis
* **Current State**: `StoppageEntry` exists with basic fields, but is not tightly linked to risk realization, schedule float erosion, or contractual financial claims.
* **ISO Standard Expectation (ISO 10006 §7.4 & FIDIC Clause 8.4)**: Any stoppage must automatically calculate financial standing cost (equipment idle hours + labor standby cost), identify responsible party (Client/Consultant/Contractor/Neutral), and evaluate time extension impact on critical path activities.
* **Gap Analysis**:
  - Stoppages do not automatically update cost actuals or project end dates.
  - Lack of formal Claim generation stemming from Client-caused or Force Majeure stoppages.

---

## Strategic Refactoring Objectives

1. **Implement Bottom-Up Physical Quantity Progress Engine**: Link daily entries + IPC certified quantities directly to WBS and Schedule Activity completion.
2. **Expand RBAC to Support Top Management & Subcontractor Roles**: Add `GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `IT_ADMIN`, `SUBCONTRACTOR_LEAD`, and implement portfolio-wide access control.
3. **Establish Universal Reason-Focused Audit System**: Build Prisma extension / wrapper for mandatory CRUD logging with before/after diffs and mandatory rationale for sensitive operations.
4. **Build Top Management Portfolio Dashboard**: Provide General Managers and C-Suite real-time cross-project progress, financial, risk, equipment, and stoppage metrics.
