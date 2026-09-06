# 03. Expanded Role-Based Access Control (RBAC) & Multi-Party Hierarchy Architecture

## Executive Overview
In accordance with **ISO 9001 §5.1 (Leadership & Commitment)** and **ISO 10006 §6.1 (Resource & Organizational Processes)**, a construction project management platform must support a clear matrix of authority across internal corporate governance, project site operations, head office operational departments, and external contract parties (Clients, Consultants, Subcontractors, Regulators).

This document details the expanded `UserRole` enumeration, multi-party organization hierarchy, permission policies, and portfolio-wide access controls.

---

## 1. Complete Expanded `UserRole` Taxonomy

The expanded RBAC architecture increases `UserRole` from 16 to **24 specialized roles** categorized into 4 tiers:

### Tier 1: Executive & Portfolio Governance (Central HQ)
1. `GENERAL_MANAGER`: Top executive overseeing all projects, portfolios, financial claims, and company-wide strategic objectives. Has global read access to all projects and approval authority for high-value variation orders and claims.
2. `MANAGING_DIRECTOR`: Executive board member focusing on overall business operations, high-level financial health, and strategic growth.
3. `CFO` / `FINANCE_DIRECTOR`: Head of Corporate Finance, approving major payment vouchers, IPC payouts, bank credit/debit advices, and corporate tax compliance.
4. `CHIEF_ENGINEER` / `TECHNICAL_DIRECTOR`: Head of Engineering Division (EAD/EGD), approving major design changes, tender submissions, and method statements.
5. `IT_ADMIN`: Technical administrator in charge of system configuration, security policies, user provisioning, database backups, and auditing system activity.

### Tier 2: Operational Department Heads (Central / Regional Offices)
6. `CONTRACTS_MANAGER`: Head of Contract Operations Division (COD), overseeing FIDIC claims, variations, subcontracts, and legal disputes.
7. `PROCUREMENT_MANAGER`: Head of Procurement Division (PRO), approving purchase orders, vendor evaluations, and material import requests.
8. `EQUIPMENT_MANAGER`: Head of Equipment Management Division (EMD), overseeing fleet allocation, maintenance schedules, and fuel utilization across all sites.
9. `HR_MANAGER`: Head of HR & Admin Division (HRAD), managing payroll, employee qualifications, and labor compliance.
10. `SAFETY_DIRECTOR` / `HSE_HEAD`: Head of Health, Safety & Environment, overseeing safety observations, incident investigation reports, and regulatory compliance.

### Tier 3: Site Management & Project Execution
11. `SENIOR_PM`: Project Manager holding ultimate field responsibility for project scope, budget, schedule, and safety compliance.
12. `DEPUTY_PM`: Assisting Senior PM with daily site operations and sub-contractor coordination.
13. `SITE_ENGINEER`: Field engineer managing physical task execution, daily quantity reports, and technical inspections.
14. `SUPERINTENDENT`: General site supervisor coordinating trade foremen, equipment deployment, and daily logistics.
15. `FOREMAN`: Trade leader (Rebar, Concrete, Earthwork) submitting daily site reports and tracking worker attendance.
16. `QS` (Quantity Surveyor): Responsible for physical quantity takeoffs, daily report verifications, IPC bill preparation, and variation pricing.
17. `QC_INSPECTOR`: Quality Control Inspector executing Inspection Test Records (ITR) and defect logs.
18. `HSE_OFFICER`: Field Safety Officer logging observations, near-misses, and safety stoppages.

### Tier 4: External Stakeholders & Subcontractors
19. `CONSULTANT_ENGINEER`: External Resident Engineer / Consultant representative approving designs, IPCs, ITRs, and variation orders.
20. `CLIENT_REP`: Client representative monitoring overall progress, milestone approvals, and funding releases.
21. `SUBCONTRACTOR_PM`: Subcontractor Project Manager managing subcontractor workforce, submitting sub-IPC measurements, and viewing assigned WBS nodes.
22. `SUBCONTRACTOR_REP`: Subcontractor field representative submitting daily work execution reports.
23. `SUPPLIER_REP`: Vendor / Material Supplier tracking purchase order receipts and store deliveries.
24. `REGULATOR_INSPECTOR`: External government / MoUDC inspector reviewing grading renewals, CAR policies, and environmental compliance.

---

## 2. Organization & Party Layer Design

To cleanly isolate external contractors and subcontractors while enabling joint collaboration:

```
                               ┌───────────────────────────┐
                               │   OVID CONSTRUCTION PLC   │
                               │   (Main Contractor Org)   │
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
  │      CLIENT ORG         │   │     CONSULTANT ORG      │   │   SUBCONTRACTOR ORGS    │
  │  (e.g., MoUDC / ERA)    │   │  (e.g., Associated Eng) │   │ (e.g., Earthworks Ltd)  │
  └─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

### Access Isolation Rules
1. **Global Executive Scope**: Users with roles `GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, and `IT_ADMIN` belonging to the primary `CONTRACTOR` organization have implicit access to ALL projects without explicit `ProjectMembership` rows.
2. **Project-Scoped Operations**: Operational roles (`SITE_ENGINEER`, `FOREMAN`, `QS`) require an active `ProjectMembership` row matching the `projectId`.
3. **Subcontractor Isolation**: Users belonging to a `SUBCONTRACTOR` organization can ONLY access WBS nodes, contracts, and measurement entries linked to their specific `Contract` or `SubcontractAgreement`. They cannot view main contractor pricing or other subcontractors' data.

---

## 3. Detailed Permission Matrix

| Action / Entity | Executive / GM | Senior PM | Site Eng / QS | QC / HSE | Consultant | Subcontractor | IT Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View All Projects** | **FULL** | Assigned | Assigned | Assigned | Assigned | Assigned Nodes | **FULL** |
| **Create Project / WBS Baseline** | Approve | Create/Edit | Read | Read | Review | None | **FULL** |
| **Submit Daily Site Reports** | Read | Review | **CREATE** | Read | Read | **CREATE** | Read |
| **Approve Daily Site Reports** | Read | **APPROVE** | Review | Read | Read | None | Read |
| **Certify Measurement / IPC** | Read | Review | Prepare | Read | **CERTIFY** | Submit | Read |
| **Approve Variation Order** | **APPROVE (>ETB 1M)** | Approve (<1M) | Prepare | Read | Review | None | Read |
| **Issue Safety Work Stoppage** | Read | Read | Read | **ISSUE** | **ISSUE** | None | Read |
| **View System Audit Logs** | **READ** | None | None | None | None | None | **FULL (Admin)** |

---

## 4. RBAC Middleware & Security Policy Specification

The permission enforcement engine in `src/lib/rbac.ts` evaluates authorization using a three-tier check:

```typescript
export async function authorizeUser(
  user: UserSession,
  requiredRole: UserRole[],
  projectId?: string,
  requiredPermission?: Permission
): Promise<boolean> {
  // 1. IT Admin Bypass
  if (user.role === 'IT_ADMIN') return true;

  // 2. C-Suite / Top Management Global Access Check
  const isTopManagement = [
    'GENERAL_MANAGER',
    'MANAGING_DIRECTOR',
    'CFO',
    'CHIEF_ENGINEER'
  ].includes(user.role);

  if (isTopManagement) {
    return checkExecutivePermission(user.role, requiredPermission);
  }

  // 3. Project Membership & Subcontractor Boundary Check
  if (projectId) {
    const membership = await getMembership(user.id, projectId);
    if (!membership) return false;

    return checkRolePermission(user.role, membership.projectRole, requiredPermission);
  }

  return false;
}
```
