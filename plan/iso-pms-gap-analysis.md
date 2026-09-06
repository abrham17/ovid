# ISO PMS Gap Analysis & Standard Alignment Master Plan

## 1. Executive Summary & Authoritative Baseline

This master analysis evaluates the Ovid Construction Project Management System (PMS) codebase against international and national standard baselines:
- **ISO 9001:2015**: Quality Management Systems — Requirements (Document control, change control, risk-based thinking, full process auditability).
- **ISO 10006:2017**: Quality Management in Projects (Scope definition, WBS decomposition, progress measurement, communication, risk, procurement).
- **ISO 21502:2020 / ISO 21500**: Guidance on Project Management and Program Management (Baselines, EVM, integrated change control, governance).
- **ISO/IEC 27001 / 27002 / 27034**: Information Security Controls & Application Security (RBAC, segregation of duties, immutable audit logging, least privilege).
- **FIDIC Conditions of Contract (Red & Yellow Books) & Ethiopian MoUDC Grade-1 Standards**: Contractual variation workflows, Interim Payment Certificates (IPC), and daily site digital twin reporting.

This document serves as the top-level index and executive summary for all 15 project lifecycle domains documented in this `plan/` folder.

---

## 2. Core Architectural Principles & ISO Alignment Strategy

1. **Physical Quantity Bottom-Up Progress**:
   - Replaces subjective UI completion percentages with real physical quantities ($m^3$ concrete, $kg$ rebar, $m^2$ formwork, $m$ pipe) reported via site daily logs and certified against BOQ target quantities.
2. **Immutable Baseline Management**:
   - Project scope, WBS, and schedule cannot be altered in place without formal change requests and versioned `ProjectBaseline` snapshotting.
3. **Strict 24-Role RBAC & Governance**:
   - Enforces scope isolation between contractors, clients, consultants, and subcontractors, while giving top corporate executive roles (`GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, `IT_ADMIN`) portfolio-wide read oversight.
4. **Centralized Pre/Post Mutation Audit Logging**:
   - Every mutation across all 14 schema domains records JSON `before` and `after` state diffs in `AuditLog` via `src/lib/services/audit.ts`.

---

## 3. Comprehensive Domain Gap Analysis Index

| Plan File | Domain Coverage | ISO Compliance Status | Primary Required Action |
| :--- | :--- | :--- | :--- |
| `01_ISO_Standard_Gap_Analysis.md` | Executive Summary & Standard Baseline | Partially Compliant | Establish master ISO 9001/10006 compliance metrics. |
| `02_System_Architecture_and_RBAC.md` | System RBAC & Corporate Oversight | Fully Aligned (Architecture) | Enforce route-level permission manifests across all REST endpoints. |
| `03_Project_Planning_and_Quantity_Tracking.md` | Bottom-Up Quantity Tracking Engine | Fully Aligned (Core Engine) | Link daily report physical quantities directly to WBS completion rollups. |
| `04_Roles_Matrix_and_Permissions.md` | Tab-by-Tab 24-Role Access Matrix | Fully Aligned (RBAC Matrix) | Restrict frontline roles from financial contract values and cost tabs. |
| `05_End_To_End_Project_Lifecycle_Scenario.md` | End-to-End Lifecycle Scenarios | Fully Aligned (Verification) | Validate tender-to-project handover and IPC measurement flows. |
| `project-creation.md` | Project Creation & Foundation | Partially Compliant | Require GM won-tender approval & `ProjectBaseline` snapshotting before `ACTIVE`. |
| `project-lifecycle.md` | Project Lifecycle State Machine | Partially Compliant | Formalize state transitions (`PLANNING` $\rightarrow$ `ACTIVE` $\rightarrow$ `SUSPENDED` $\rightarrow$ `CLOSED`). |
| `project-roles-and-permissions.md` | Role Assignments & History | Partially Compliant | Add `ProjectRoleAssignment` audit history table and `ProjectRole` enum. |
| `wbs-and-task-management.md` | WBS Breakdown & 100% Rule | Fully Aligned | Enforce 100% sibling weight sum rule via Prisma middleware & service layer. |
| `task-assignment.md` | Task Creation & Assignment | Partially Compliant | Formalize single accountable party & `ActivityAssignment` audit history. |
| `progress-tracking.md` | Progress & Variance Calculation | Fully Aligned (Physical Engine) | Derive schedule variance ($SV = EV - PV$) using physical EV and PV. |
| `schedule-management.md` | CPM, Float & Baselines | Partially Compliant | Build critical path CPM solver and `ScheduleChangeRequest` workflow. |
| `project-monitoring-and-control.md` | Control Loop & EVM KPIs | Partially Compliant | Trigger automated `ExecutiveIntervention` on severe cost/schedule variance. |
| `change-management.md` | Integrated Change Control | Fully Aligned | Mandate `ScheduleChangeRequest` & `VariationOrder` formal approval gates. |
| `risk-and-issues.md` | Risk Register & Stoppage Linkage | Fully Aligned | Link realized risks to `StoppageEntry` and `VariationOrder` records. |
| `quality-controls.md` | Quality, ITRs & Nonconformity | Fully Aligned | Gate WBS node completion on 100% passed ITRs and closed defects. |
| `document-control.md` | ISO 9001 §7.5 Document Repository | Fully Aligned | Enforce document revision chain, sign-offs, and effective dates. |
| `audit-and-traceability.md` | Centralized Audit & Traceability | Fully Aligned | Capture `before` and `after` JSON diffs across all CRUD operations. |
| `database-architecture.md` | Prisma Schema & Relational Integrity | Fully Aligned | Support all 14 schema domains with strict foreign key constraints. |
| `implementation-roadmap.md` | Sequential Implementation Plan | Roadmap Ready | Follow 8-phase sequential rollout from foundation to final UI. |

---

## 4. Master Implementation Roadmap Summary

```
Phase 1: Foundation & RBAC (Audit, Permissions, Route Manifest)
   ↓
Phase 2: Project Creation & Baseline Engine (Objectives, Tenders, Baseline Snapshots)
   ↓
Phase 3: WBS Decomposition & Subcontractor Plan Submission (100% Weight Rule)
   ↓
Phase 4: Physical Quantity Daily Site Twin Tracking (Earthwork, Structure, Rebar)
   ↓
Phase 5: Schedule Management & Critical Path Analysis (CPM, Float, Change Requests)
   ↓
Phase 6: Quality, HSE, and Document Control Gates (ITRs, Defects, ISO 9001 §7.5)
   ↓
Phase 7: Integrated Change & Risk Control Loop (Variations, Stoppages, Interventions)
   ↓
Phase 8: Executive Portfolio Dashboards & Regulatory Reporting
```
