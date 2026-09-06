# 24-Role RBAC Permissions & Tab-by-Tab Operations Matrix

## Executive Overview

This document provides a detailed breakdown of the 24 roles within the Project Management System (PMS). For each role, it specifies:
- Operational scope and authority tier.
- Tab-by-tab responsibilities across all system modules.
- What they **CAN see** vs. **CANNOT see**.
- What they **CAN enter/edit** vs. **CANNOT enter/edit**.

---

## System Modules / Tabs Overview

1. **Portfolio & Company Executive Dashboard** (`/portfolio`, `/company`): Corporate KPIs, cross-project financials, executive interventions.
2. **Project Initiation & Settings** (`/projects`, `/projects/[id]/settings`): Charter, contract terms, party assignments.
3. **WBS & Scope Breakdown** (`/projects/[id]/wbs`): WBS hierarchy, 100% rule weighting, plan submissions.
4. **Schedule & Activities** (`/projects/[id]/schedule`): Primavera/Gantt schedules, dependencies, change requests.
5. **Daily Site Reports** (`/projects/[id]/daily-reports`): Earthwork, Structure, Rebar digital twins.
6. **Quantity & Measurement (IPC)** (`/projects/[id]/measurements`): BOQ items, physical quantity entries, IPC certificates.
7. **Variations & Change Orders** (`/projects/[id]/variations`): Day Work / Variation order claims and approvals.
8. **Risk & Stoppages** (`/projects/[id]/risks`, `/projects/[id]/stoppages`): Risk register, work stoppage logs.
9. **Quality Control & Inspections** (`/projects/[id]/quality`): ITR, Defect Logs, Punch List.
10. **HSE & Safety** (`/projects/[id]/safety`): Safety observations, incident reports.
11. **Subcontractor Oversight & Requests** (`/projects/[id]/oversight`): Independent verification logs, resource requests.
12. **Procurement & Custody** (`/projects/[id]/procurement`, `/projects/[id]/custody`): Purchase Orders, chain of custody logs.
13. **Equipment Fleet Management** (`/projects/[id]/equipment`): Equipment allocation, usage, idle/down hours.
14. **Document Control & Decision Log** (`/projects/[id]/documents`): ISO 9001 §7.5 document repository, decision logs.
15. **System Administration & Audit Logs** (`/company/audit-logs`, `/admin`): Centralized audit log inspection, user management.

---

## Detailed Role Specifications

---

### Tier 1: Corporate Top Executive Governance

#### 1. GENERAL_MANAGER (General Manager / CEO)
* **Scope**: Portfolio-wide cross-project authority.
* **Can See**:
  - All tabs across ALL projects nationwide without needing individual project membership.
  - Cross-project financial summaries, high-value variations, executive interventions, and audit logs.
* **Cannot See**: None (Full read access to all system data).
* **Can Enter / Edit**:
  - Approve high-value contracts and high-value variations (`CompanyApproval`).
  - Create and close `ExecutiveIntervention` tickets.
  - Approve project initiation and scope baselines.
* **Cannot Enter / Edit**:
  - Cannot directly create or edit raw site daily entries (Earthwork, Structure, Rebar).
  - Cannot modify raw ITR test inspection records.

#### 2. MANAGING_DIRECTOR (Managing Director)
* **Scope**: Executive strategic governance.
* **Can See**: All portfolio dashboards, project performance metrics, corporate risk registers, and company approvals.
* **Cannot See**: None.
* **Can Enter / Edit**:
  - Approve project initiation charters and corporate strategy approvals.
  - Issue CEO Directions on `ExecutiveInterventionEvent`.
* **Cannot Enter / Edit**:
  - Cannot enter daily operational data (measurement entries, daily reports, purchase orders).

#### 3. CFO (Chief Financial Officer)
* **Scope**: Corporate financial oversight.
* **Can See**:
  - Portfolio financial tab, project IPC payments, cost actuals vs. budget, variations cost impact.
  - Executive financial metrics and purchase order values.
* **Cannot See**: Detailed site safety observations or technical rebar bending schedules (hidden or non-primary).
* **Can Enter / Edit**:
  - Final financial authorization on IPC payment releases.
  - Approve high-value purchase orders and financial budget adjustments.
* **Cannot Enter / Edit**:
  - Cannot edit WBS structural hierarchy, design reviews, or quality ITR logs.

#### 4. CHIEF_ENGINEER (Chief Engineer)
* **Scope**: Technical engineering governance.
* **Can See**: All project WBS tabs, design reviews, technical specifications, ITR logs, and variation technical impacts.
* **Cannot See**: Corporate HR payroll sheets or internal administrative financial vouchers.
* **Can Enter / Edit**:
  - Approve design standard reviews (`DesignReview`).
  - Sign off on technical variations and engineering dispute resolutions.
* **Cannot Enter / Edit**:
  - Cannot release financial payments or approve procurement invoices.

#### 5. IT_ADMIN (System & IT Administrator)
* **Scope**: System security, user management, and compliance auditing.
* **Can See**:
  - User management tab, role assignment history, system settings.
  - Centralized Audit Logs (`/company/audit-logs`) across all CRUD operations.
* **Cannot See**: Confidential commercial pricing negotiations (unless required for audit).
* **Can Enter / Edit**:
  - Invite users, manage user status (`active`/`inactive`), assign company roles.
  - View full `before` and `after` audit log diffs.
* **Cannot Enter / Edit**:
  - Cannot enter or falsify daily progress measurements, daily site reports, or financial certificates.

#### 6. INTERNAL_AUDITOR (Internal Auditor)
* **Scope**: Independent compliance & quality auditing.
* **Can See**:
  - Full read-only access to ALL project tabs, financial entries, measurement entries, and audit logs.
* **Cannot See**: None.
* **Can Enter / Edit**:
  - Raise `AuditFinding` records and remediation plans.
* **Cannot Enter / Edit**:
  - Cannot edit or delete existing project records, measurements, or daily site entries (strict read-only except audit findings).

#### 7. LEGAL_SERVICE_MANAGER (Legal Service Manager)
* **Scope**: Contractual compliance, FIDIC claims, and dispute resolution.
* **Can See**: Contract terms, variation order claims, dispute records (`DisputeRecord`), stoppage logs, and correspondence.
* **Cannot See**: Detailed daily equipment maintenance hours or raw rebar daily entries.
* **Can Enter / Edit**:
  - Create and update dispute resolution records and legal claim assessments.
* **Cannot Enter / Edit**:
  - Cannot modify physical measurement entries or approve technical design reviews.

#### 8. EQUIPMENT_ADMIN_MANAGER (Equipment Administration Manager)
* **Scope**: Corporate fleet allocation & inter-project equipment transfers.
* **Can See**:
  - Corporate Equipment tab (`/company/equipment`), usage logs, operating vs. idle/down hours across all projects.
* **Cannot See**: Financial payroll data, design reviews, or safety incident details.
* **Can Enter / Edit**:
  - Allocate equipment to projects (`EquipmentAllocation`), record custody transfers (`CustodyLog`).
* **Cannot Enter / Edit**:
  - Cannot edit WBS schedule activities or approve IPC measurement certificates.

#### 9. HEAD_PLANNING_MONITORING (Head of Planning & Monitoring)
* **Scope**: Portfolio schedule & baseline change governance.
* **Can See**: Schedules (`/projects/[id]/schedule`), WBS trees, schedule change requests, and stoppage logs.
* **Cannot See**: Financial bank payment vouchers or internal HR personnel files.
* **Can Enter / Edit**:
  - Review and approve baseline schedule change requests (`ScheduleChangeRequest`).
  - Enforce WBS 100% rule weighting standards.
* **Cannot Enter / Edit**:
  - Cannot edit site daily reports or approve purchase orders.

#### 10. HEAD_TENDERING & TENDERING_OFFICER (Tendering Department)
* **Scope**: Bidding, subcontracts, and procurement tender registry.
* **Can See**:
  - Tender & Bid tab (`/company/tenders`), subcontractor bids, BOQ unit rates.
* **Cannot See**: Internal daily site logs or employee attendance records.
* **Can Enter / Edit**:
  - Register new tenders, update bid statuses (`BidTender`).
* **Cannot Enter / Edit**:
  - Cannot approve site measurement certificates or edit active project schedules.

---

### Tier 2: Project Management & Technical Operations

#### 11. SENIOR_PM / DEPUTY_PM (Project Manager / Deputy PM)
* **Scope**: Full operational authority over assigned project.
* **Can See**: All tabs within assigned project(s).
* **Cannot See**: Projects where they do not have active project membership (unless granted cross-project permission).
* **Can Enter / Edit**:
  - Approve subcontractor plan submissions (`WbsPlanSubmission`).
  - Submit variation orders, request schedule changes, manage project risks.
* **Cannot Enter / Edit**:
  - Cannot sign off on Consultant-side approvals (IPC certification or resident engineer sign-offs).

#### 12. SITE_ENGINEER / OFFICE_ENGINEER (Site & Office Engineers)
* **Scope**: Site execution & daily report input.
* **Can See**: WBS, Schedule, Daily Reports, Measurements, Quality, Safety, Documents.
* **Cannot See**: Company executive approvals or corporate financial bank details.
* **Can Enter / Edit**:
  - Create daily site entries (Earthwork, Structure, Rebar).
  - Record measurement entries ($m^3$, $kg$, $m^2$).
* **Cannot Enter / Edit**:
  - Cannot formally certify IPC payment certificates or approve schedule baseline changes.

#### 13. SUPERINTENDENT / FOREMAN (Site Trade Supervisors)
* **Scope**: Frontline trade supervision.
* **Can See**: Assigned WBS sections, daily site report logs, safety observations.
* **Cannot See**: Financial contract values, BOQ unit rates, purchase orders.
* **Can Enter / Edit**:
  - Input draft daily report entries, labor headcount, equipment operating hours.
* **Cannot Enter / Edit**:
  - Cannot submit formal variation orders or approve WBS node weights.

#### 14. QC_INSPECTOR (Quality Control Inspector)
* **Scope**: Quality assurance, inspections, and defects.
* **Can See**: Quality tab (ITRs, Defects, Punch List), WBS structural elements, daily structure entries.
* **Cannot See**: Project financial contracts, purchase order pricing.
* **Can Enter / Edit**:
  - Record ITR results (`PASS`/`FAIL`), open Defect Logs, update Punch List items.
* **Cannot Enter / Edit**:
  - Cannot modify site measurements or approve schedule changes.

#### 15. HSE_OFFICER (Health, Safety & Environment Officer)
* **Scope**: Site safety & compliance.
* **Can See**: Safety tab (Observations, Incidents), Work Stoppage logs.
* **Cannot See**: Financial pricing, BOQ unit rates, contract retention values.
* **Can Enter / Edit**:
  - Log safety hazards (`SafetyObservation`), open/close `SafetyIncident` tickets, log safety-related work stoppages.
* **Cannot Enter / Edit**:
  - Cannot modify WBS structure or certify physical measurement entries.

#### 16. QS (Quantity Surveyor)
* **Scope**: Physical measurement validation & BOQ control.
* **Can See**: Measurements tab, BOQ items, Daily Reports, Variations, Purchase Orders.
* **Cannot See**: HSE incident investigation details or HR employee handbooks.
* **Can Enter / Edit**:
  - Input and verify physical measurement entries ($Q_{certified}$ vs $Q_{target}$), prepare draft IPCs.
* **Cannot Enter / Edit**:
  - Cannot sign off as Resident Engineer / Consultant verifier.

#### 17. CONSULTANT_ENGINEER / RESIDENT_ENGINEER (Consultant Representative)
* **Scope**: Third-party supervision & certification.
* **Can See**: All technical project tabs (WBS, Daily Reports, Measurements, Quality, Variations, Documents).
* **Cannot See**: Contractor's internal cost margins or confidential payroll entries.
* **Can Enter / Edit**:
  - Certify Measurement Entries (`CERTIFIED` status), approve/reject ITRs, sign off daily reports.
* **Cannot Enter / Edit**:
  - Cannot edit Contractor's draft measurement quantities directly (must query or certify).

#### 18. CLIENT_REP (Client Representative)
* **Scope**: Owner oversight.
* **Can See**: Executive project dashboard, high-level physical progress, milestone schedules, certified IPC summaries.
* **Cannot See**: Contractor internal cost actuals, labor wages, or equipment maintenance breakdown details.
* **Can Enter / Edit**:
  - Issue Client Instructions and view project progress reports.
* **Cannot Enter / Edit**:
  - Cannot modify WBS structures or enter daily site reports.

---

### Tier 3: Subcontractors & Operational Staff

#### 19. SUBCONTRACTOR_PM (Subcontractor Project Manager)
* **Scope**: Execution of assigned subcontract scope branch.
* **Can See**: Assigned WBS branch (`scopeWbsNodeId`), assigned schedule activities, subcontractor resource requests.
* **Cannot See**: Unassigned WBS branches, main contract BOQ rates, or other subcontractors' data.
* **Can Enter / Edit**:
  - Submit WBS plan proposals (`WbsPlanSubmission`), request resources (`ResourceRequest`), submit daily site entries for their branch.
* **Cannot Enter / Edit**:
  - Cannot approve their own plan submissions or certify their own measurements.

#### 20. PROCUREMENT / FINANCE / HR / CONTRACTS_LEGAL (Operational Roles)
* **Scope**: Departmental support.
* **Can See**: Respective operational tabs (Procurement $\rightarrow$ POs/Receipts; Finance $\rightarrow$ Payments/Vouchers; HR $\rightarrow$ Attendance/Employees; Contracts $\rightarrow$ Agreements).
* **Cannot See**: Unrelated operational domains.
* **Can Enter / Edit**: Enter departmental vouchers, purchase orders, attendance sheets.
* **Cannot Enter / Edit**: Cannot alter physical progress measurements or WBS trees.
