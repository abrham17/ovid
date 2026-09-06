# 24-Role Tab-by-Tab RBAC & Capabilities Matrix (ISO Alignment)

## 1. Executive Summary

This document presents the complete 24-role Role-Based Access Control (RBAC) matrix for the Ovid Project Management System (PMS). The taxonomy is evaluated against **ISO 9001:2015 §5.3** (Organizational roles & responsibilities), **ISO 10006:2017 §6.1** (Resource management & delegation), **ISO/IEC 27001:2022 A.5.15–A.5.18** (Access control & segregation of duties), and **FIDIC / Ethiopian MoUDC Grade-1** construction governance guidelines.

The matrix distinguishes between:
1. **16 Project-Level Functional Roles** (`FOREMAN` to `ADMIN`, plus `OFFICE_ENGINEER`, `SUBCONTRACTOR_PM`, `COMPANY_STAFF`).
2. **12 Corporate Executive Governance Roles** (`GENERAL_MANAGER` to `INTERNAL_AUDITOR`).

---

## 2. Tab-by-Tab Workspace & Portfolio Access Matrix

Legend:
- **FULL**: Read, Create, Edit, Delete/Approve where applicable.
- **READ**: View/Read-only access.
- **RESTRICTED**: Scope-isolated read/write (e.g. assigned WBS section only).
- **NONE**: No view or write capability.

| Role | Workspace Overview | WBS Tab | Schedule & CPM Tab | Daily Reports | Quality & ITRs | Safety & HSE | Cost & BOQ | Resources (Labor/Equip) | Procurement Tab | Documents Tab | Risk & Stoppage | Portfolio Dashboard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GENERAL_MANAGER** | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | **FULL** |
| **MANAGING_DIRECTOR** | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | **FULL** |
| **CFO** | READ | READ | READ | READ | READ | READ | **FULL** | READ | READ | READ | READ | **FULL** |
| **CHIEF_ENGINEER** | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | **FULL** |
| **INTERNAL_AUDITOR** | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | READ | **FULL** |
| **SENIOR_PM** | **FULL** | **FULL** | **FULL** | APPROVE | APPROVE | APPROVE | **FULL** | READ | APPROVE | **FULL** | **FULL** | READ |
| **DEPUTY_PM** | **FULL** | **FULL** | **FULL** | APPROVE | APPROVE | APPROVE | EDIT | READ | APPROVE | **FULL** | **FULL** | READ |
| **SITE_ENGINEER** | READ | RESTRICTED | RESTRICTED | EDIT | EDIT | EDIT | NONE | NONE | NONE | EDIT | EDIT | NONE |
| **SUPERINTENDENT** | READ | RESTRICTED | RESTRICTED | APPROVE | EDIT | EDIT | NONE | EDIT | NONE | READ | EDIT | NONE |
| **FOREMAN** | READ | RESTRICTED | RESTRICTED | EDIT | READ | EDIT | NONE | NONE | NONE | NONE | NONE | NONE |
| **OFFICE_ENGINEER** | READ | READ | READ | EDIT | READ | READ | EDIT | NONE | READ | EDIT | EDIT | NONE |
| **QC_INSPECTOR** | READ | READ | READ | READ | **FULL** | READ | NONE | NONE | NONE | EDIT | READ | NONE |
| **HSE_OFFICER** | READ | READ | READ | READ | READ | **FULL** | NONE | READ | NONE | EDIT | READ | NONE |
| **QUANTITY_SURVEYOR** | READ | READ | READ | NONE | NONE | NONE | **FULL** | NONE | READ | EDIT | NONE | NONE |
| **PROCUREMENT** | READ | READ | READ | NONE | NONE | NONE | READ | NONE | **FULL** | EDIT | NONE | NONE |
| **FINANCE** | READ | READ | READ | NONE | NONE | NONE | APPROVE | NONE | APPROVE | READ | NONE | NONE |
| **HR** | READ | NONE | NONE | NONE | NONE | READ | NONE | **FULL** | NONE | READ | NONE | NONE |
| **EQUIPMENT_MANAGER** | READ | NONE | READ | NONE | NONE | NONE | NONE | **FULL** | NONE | READ | NONE | NONE |
| **CONTRACTS_LEGAL** | READ | READ | READ | NONE | NONE | NONE | READ | NONE | NONE | **FULL** | EDIT | NONE |
| **CONSULTANT_ENGINEER** | READ | READ | READ | READ | APPROVE | READ | APPROVE | NONE | NONE | APPROVE | READ | NONE |
| **CLIENT_REP** | READ | READ | READ | READ | READ | READ | APPROVE | NONE | NONE | READ | READ | NONE |
| **SUBCONTRACTOR_PM** | READ | RESTRICTED | RESTRICTED | APPROVE | READ | EDIT | RESTRICTED | RESTRICTED | NONE | EDIT | EDIT | NONE |
| **ADMIN** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** | **FULL** |

---

## 3. Deep Analysis of Every Role

### 1. General Manager (`GENERAL_MANAGER`)
- **Identity**: Defined in `CompanyStaffRole`, assigned via `CompanyStaffAssignment`. Scope is organization-wide.
- **Can See**: Full corporate portfolio dashboard (`/portfolio`), all projects, financial performance metrics, high-value variation requests, executive interventions.
- **Cannot See**: Unassigned internal draft notes of other parties.
- **Can Do**: Approve project creation from won tenders, approve high-value variations/IPC payments, initiate/close executive interventions.
- **Cannot Do**: Directly overwrite site inspection test results or daily physical entries.
- **ISO Alignment**: Fully satisfies ISO 21502 §5 (Governance) and ISO 9001 §5.1 (Leadership).

### 2. Managing Director (`MANAGING_DIRECTOR`)
- **Identity**: Top corporate executive. Global organization scope.
- **Can See**: Portfolio overview, corporate financial risk exposure, audit finding summaries.
- **Can Do**: Grant final executive approval for project closure and contract termination.
- **ISO Alignment**: Satisfies top management accountability requirements.

### 3. Chief Financial Officer (`CFO`)
- **Identity**: Corporate executive officer responsible for financial controls.
- **Can See**: Portfolio-wide contract values, cash flow forecasts, certified IPC payment totals, financial risk heatmaps.
- **Cannot See**: Frontline labor daily time cards unless aggregated.
- **Can Do**: Approve high-value financial commitments and IPC disbursements.

### 4. Chief Engineer (`CHIEF_ENGINEER`)
- **Identity**: Corporate technical lead.
- **Can See**: All engineering designs, design reviews, ITR quality trends, critical path schedule delays across the portfolio.
- **Can Do**: Approve company design standards and resolve technical disputes.

### 5. Internal Auditor (`INTERNAL_AUDITOR`)
- **Identity**: Independent corporate compliance auditor.
- **Can See**: Full audit trails (`AuditLog`), before-and-after JSON state diffs, nonconformity logs, system user role assignment histories.
- **Cannot Do**: Mutate project operational data (strict segregation of duties).
- **ISO Alignment**: Fully satisfies ISO 27001 A.8.15 (Logging) and ISO 9001 §9.2 (Internal audit).

### 6. Senior Project Manager (`SENIOR_PM`)
- **Identity**: Project-level single point of accountability. Defined in `UserRole` and `ProjectRole`.
- **Can See**: Complete project workspace (WBS, schedule, cost, quality, safety, team, documents, risks).
- **Can Do**: Create/approve initial project baseline (`ProjectBaseline`), approve subcontractor WBS plan submissions, approve schedule changes, approve variation orders, manage project team memberships.
- **Cannot Do**: Modify company-wide financial thresholds or approve tenders.

### 7. Deputy Project Manager (`DEPUTY_PM`)
- **Identity**: Second-in-command project lead.
- **Can See**: Full project workspace except final contract termination controls.
- **Can Do**: Review daily site reports, approve routine ITRs, manage WBS updates.

### 8. Site Engineer (`SITE_ENGINEER`)
- **Identity**: Operational field engineer. Assigned to specific WBS sections via `SectionAssignment`.
- **Can See**: Assigned WBS section nodes, activities, daily reports, quality submittals, and site drawings.
- **Cannot See**: Financial contract values, IPC unit rates, cost actuals, full corporate employee salaries.
- **Can Do**: Create daily site entries (Earthwork, Structure, Rebar), log safety observations, log quality defects, assign tasks to foremen within their section.

### 9. Superintendent (`SUPERINTENDENT`)
- **Identity**: Field construction manager overseeing site foremen and equipment execution.
- **Can See**: Field activities, labor attendance, equipment usage logs, daily report approvals.
- **Cannot See**: Commercial contract pricing, financial margins.
- **Can Do**: Approve daily site report entries, assign foremen to activities, log equipment stoppages.

### 10. Foreman (`FOREMAN`)
- **Identity**: Frontline crew lead. Restricted to assigned activities (`ActivityAssignment`).
- **Can See**: "My Tasks" widget, assigned schedule activities, daily site entry forms.
- **Cannot See**: Cost management tab, financial rates, overall project contract values, unassigned WBS branches.
- **Can Do**: Submit daily progress entries, report safety hazards, record labor time on task.

### 11. Office Engineer (`OFFICE_ENGINEER`)
- **Identity**: Technical project engineer managing submittals, takeoff calculations, and variation documentation.
- **Can See**: WBS, schedule, takeoff structural quantities, variation order drafts, document repository.
- **Can Do**: Prepare variation orders, upload engineering drawings, draft schedule change requests.

### 12. Quality Control Inspector (`QC_INSPECTOR`)
- **Identity**: Independent site quality inspector.
- **Can See**: Quality tab, WBS nodes, inspection test records (ITRs), defect logs, punch lists.
- **Cannot See**: Financial contract pricing or cost tabs.
- **Can Do**: Conduct inspections, pass/fail ITRs, raise defect logs, verify defect rework closure (`VERIFIED_CLOSED`).
- **ISO Alignment**: Satisfies ISO 9001 §8.6 (Quality release gate independence).

### 13. Safety / HSE Officer (`HSE_OFFICER`)
- **Identity**: On-site safety officer.
- **Can See**: Safety tab, incident logs, safety observations, hazardous work stoppages.
- **Can Do**: Log safety observations, issue safety stoppage orders, verify corrective actions on critical incidents.

### 14. Quantity Surveyor (`QS`)
- **Identity**: Commercial cost estimator and measurement surveyor.
- **Can See**: BOQ items, unit rates, IPC measurement entries, variation order cost estimates.
- **Can Do**: Draft IPC measurements, prepare BOQ quantity takeoffs, evaluate cost impacts.

### 15. Procurement Officer (`PROCUREMENT`)
- **Identity**: Supply chain and purchasing manager.
- **Can See**: Material demands, purchase orders, supplier profiles, material receipts.
- **Can Do**: Issue purchase orders, record material receipts, track delivery lead times.

### 16. Finance Officer (`FINANCE`)
- **Identity**: Project accountant.
- **Can See**: Certified IPC payment vouchers, cost actuals, purchase order invoices.
- **Can Do**: Certify payment receipts, process IPC disbursements.

### 17. HR Manager (`HR`)
- **Identity**: Personnel and labor administrator.
- **Can See**: Employee directory, labor attendance, employment contracts.
- **Can Do**: Onboard employees, manage labor attendance records.

### 18. Equipment Manager (`EQUIPMENT_MANAGER`)
- **Identity**: Fleet and machinery fleet manager.
- **Can See**: Equipment register, equipment usage logs, custody logs, allocation schedules.
- **Can Do**: Allocate machinery to projects, track breakdown/down hours.

### 19. Contracts / Legal Manager (`CONTRACTS_LEGAL`)
- **Identity**: Contract administrator and legal advisor.
- **Can See**: Contracts, subcontracts, variation orders, dispute records, formal correspondence.
- **Can Do**: Draft contract templates, review variation order clauses, manage dispute escalations.

### 20. Resident / Consultant Engineer (`CONSULTANT_ENGINEER`)
- **Identity**: Client-side supervising engineer.
- **Can See**: Quality submittals, IPC measurements, variation orders, design reviews, schedule baselines.
- **Can Do**: Certify IPC measurements (`CONSULTANT_APPROVED`), approve variation orders, review design submittals.

### 21. Client Representative (`CLIENT_REP`)
- **Identity**: Project owner's designated representative.
- **Can See**: Executive progress summary, S-curves, certified IPC totals, variation order summaries.
- **Can Do**: Approve major variation orders and formal contract modifications.

### 22. Subcontractor PM (`SUBCONTRACTOR_PM`)
- **Identity**: Subcontractor's project manager. Scope isolated strictly to their subcontracted WBS branch (`Contract.scopeWbsNodeId`).
- **Can See**: Contracted WBS branch, subcontracted activities, subcontractor daily reports, resource requests.
- **Cannot See**: Main contractor's master contract value, other subcontractors' WBS branches or IPC claims.
- **Can Do**: Submit `WbsPlanSubmission` for subcontracted branch, assign subcontractor crew, submit resource requests.

### 23. Company Staff (`COMPANY_STAFF`)
- **Identity**: General organization staff without executive assignment.
- **Can See**: Read-only overview of assigned company projects.

### 24. Administrator (`ADMIN`)
- **Identity**: System technical administrator.
- **Can See**: Full system configuration, user accounts, system logs.
- **Can Do**: User management, system configuration. Business approvals are deferred to General Manager / Top Executives per ISO segregation of duties.

---

## 4. Security & Server Enforcement Architecture

1. **Frontend Isolation**:
   - Navigation tabs are filtered via `getVisibleTabs(role)`.
   - UI controls are conditionally rendered using `src/lib/permissions-client.ts`.
2. **API & Server Authorization**:
   - Every REST endpoint validates session authentication via `getSessionUser(req)`.
   - Route permissions are checked against `src/permissions/route-permissions.json` using `assertRoutePermission()`.
   - Project memberships are validated via `assertProjectAccess()`.
   - WBS scope boundaries are enforced via `assertScopeWritable(scope, wbsNodeId)`.
3. **Database Layer**:
   - Foreign key constraints, unique indexes, and Prisma transaction boundaries prevent corrupt mutations.
   - Mutations trigger `logAuditEntry()` capturing `{ before, after }` state diffs.
