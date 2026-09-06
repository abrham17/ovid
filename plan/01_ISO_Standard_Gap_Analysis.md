# ISO Standard Gap Analysis: Codebase vs ISO 9001, ISO 10006 & Ethiopian Grade-1 Standards

## 1. Executive Summary

This document presents a comprehensive gap analysis between the existing Project Management System (PMS) codebase and international / local construction standards:
- **ISO 9001:2015**: Quality Management Systems — Requirements (Document control, change management, traceability, audit trail).
- **ISO 10006:2017**: Quality Management in Projects (WBS structure, progress tracking, risk, procurement, resource management).
- **FIDIC Conditions of Contract** (Red & Yellow Books) & **Ethiopian MoUDC Grade-1 Practice**: Standard Ethiopian construction governance, Interim Payment Certificates (IPC), variation orders, and site daily records.

The primary objective is to transform the PMS into a standard-compliant, non-ERP construction project management platform focused on:
1. Real, bottom-up physical quantity-based progress tracking.
2. Complete project lifecycle planning and activity distribution.
3. Strict Role-Based Access Control (RBAC) with top-executive cross-project visibility.
4. Centralized audit logging capturing before-and-after state changes across all CRUD operations.

---

## 2. Gap Analysis Matrix

| Domain | ISO / FIDIC Requirement | Current Codebase Implementation | Identified Gaps & Alignment Strategy |
| :--- | :--- | :--- | :--- |
| **Progress Tracking** | ISO 10006 §7.4: Progress measurement must be based on verified physical quantities completed vs BOQ targets. | Legacy subjective percentage completion (`progressPercent`) was used in generic WBS nodes without mandatory physical quantity validation. | **Alignment**: Mandate physical quantity entry (e.g., $m^3$ concrete poured, $kg$ rebar installed, $m^2$ formwork placed) from daily reports (Earthwork, Structure, Rebar) verified against BOQ target quantities. |
| **Project Planning & WBS** | ISO 10006 §5.2 / FIDIC Sub-Clause 8.3: Full project breakdown from initiation to closure; 100% rule for WBS decomposition; multi-tier approval. | Basic WBS nodes existed, but subcontractor sub-trees lacked formal submission & multi-tiered approval workflows. | **Alignment**: Introduce formal `WbsPlanSubmission` workflows where subcontractor sub-trees remain in `DRAFT` state until formally approved by the Main Contractor PM. |
| **Document Control & Audit** | ISO 9001 §7.5 & §8.5.2: Traceability of all system mutations with before/after diffs for IT/Admin governance. | Basic `AuditLog` table recorded `entityType`, `entityId`, `action`, `userId`, `diff`, but lacked systematic capture of pre-mutation and post-mutation states for all endpoints. | **Alignment**: Enhance central audit logger to capture full pre-mutation (`before`) and post-mutation (`after`) state diffs across all CRUD operations. |
| **Role-Based Access Control** | ISO 9001 §5.3 / FIDIC Governance: Clear executive oversight roles (GM, Managing Director, CFO, Chief Engineer) with portfolio-wide cross-project visibility. | Basic project-level roles were present, but lacked comprehensive top executive governance permissions across projects and departments. | **Alignment**: Implement 24-role RBAC taxonomy featuring corporate executive roles (`GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, `IT_ADMIN`) with read-all portfolio oversight. |
| **Site Operations & Daily Reports** | MoUDC Grade-1 / FIDIC: Daily site report digital twins (Earthwork, Structure, Rebar) feeding progress and equipment utilization directly. | Schema included daily report entities, but frontend / API integration required complete bottom-up rollup into WBS physical quantities. | **Alignment**: Ensure daily report submissions directly feed the physical quantity tracking engine, closing the gap between site logs and progress reporting. |

---

## 3. Plan for Achieving Standard Alignment

1. **Schema & Model Enforcement**:
   - Refine `prisma/schema.prisma` to mandate physical quantities on all WBS completion calculations.
   - Capture before/after state diffs on all `AuditLog` writes.

2. **Core Progress Tracking Engine**:
   - Implement bottom-up quantity calculation where $PhysicalProgress \% = \frac{\sum PhysicalQuantity_{Certified}}{PhysicalQuantity_{BOQ\_Target}} \times 100$.

3. **Lifecycle & Governance**:
   - Ensure initiation-to-closure project lifecycle tracking with mandatory approval checkpoints at initiation, planning, execution, and closure.
