# System Architecture, RBAC & Centralized Audit Logging Strategy

## 1. Executive Governance & Expanded Role Taxonomy

To meet ISO 9001 §5.3, ISO 10006, and FIDIC project management governance requirements, the system implements a 24-role RBAC taxonomy divided across three distinct operational tiers:

### Tier 1: Corporate Top Executive Governance
These roles possess portfolio-wide, cross-project visibility and strategic decision/approval authority:
1. `GENERAL_MANAGER`: Full executive portfolio-wide oversight, high-value contract/variation approvals, executive interventions.
2. `MANAGING_DIRECTOR`: Overall strategic corporate governance and company performance oversight.
3. `CFO` / `FINANCE_DEPT_MANAGER`: Financial oversight, IPC payment release authorization, corporate budget control.
4. `CHIEF_ENGINEER`: Engineering standard approvals, critical design review sign-offs, technical dispute escalations.
5. `IT_ADMIN`: System maintenance, security compliance, organization settings, and audit log monitoring.
6. `INTERNAL_AUDITOR`: Portfolio-wide read-only compliance inspection and audit finding generation.
7. `LEGAL_SERVICE_MANAGER`: Contractual claims, disputes, and FIDIC legal compliance.
8. `EQUIPMENT_ADMIN_MANAGER`: Corporate equipment allocation, fleet availability, and inter-project transfers.
9. `HEAD_PLANNING_MONITORING`: Portfolio schedule monitoring, baseline change review, WBS standard enforcement.
10. `HEAD_TENDERING` & `TENDERING_OFFICER`: Procurement, bidding, and tender management.

### Tier 2: Project Management & Technical Operations
Project-level roles tied to specific project memberships:
11. `SENIOR_PM` / `DEPUTY_PM`: Full project execution authority, baseline change requests, subcontractor plan approvals.
12. `SITE_ENGINEER` / `OFFICE_ENGINEER`: Daily report logging, activity progress tracking, measurement entries.
13. `SUPERINTENDENT` / `FOREMAN`: On-site trade supervision, labor attendance, daily earthwork/structure inputs.
14. `QC_INSPECTOR`: Inspection Test Records (ITR), defect logging, punch list verification.
15. `HSE_OFFICER`: Safety observations, incident reports, stoppage logs.
16. `QS` (Quantity Surveyor): Physical measurement validation, BOQ quantity tracking, IPC preparation.
17. `CONSULTANT_ENGINEER` / `RESIDENT_ENGINEER`: Consultant sign-off, IPC certification, quality approvals.
18. `CLIENT_REP`: Client oversight, high-level project status inspection.

### Tier 3: Subcontractors & External Parties
19. `SUBCONTRACTOR_PM`: Subcontractor WBS plan submission, resource requests, daily activity logging.
20. `PROCUREMENT` / `FINANCE` / `HR` / `CONTRACTS_LEGAL`: Operational department roles.

---

## 2. Centralized Audit Logging Architecture (Before & After Diffs)

ISO 9001 §7.5 mandates strict document control and traceability for all system mutations. To ensure complete accountability across IT and administrative departments, all CRUD operations record pre-mutation (`before`) and post-mutation (`after`) state diffs:

1. **Central Audit Logger (`lib/services/audit.ts`)**:
   - Intercepts all CRUD operations (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`).
   - Captures:
     - `userId`: The operator executing the change.
     - `entityType` & `entityId`: The target resource (e.g., `WbsNode`, `Contract`, `ScheduleActivity`).
     - `action`: Audit action enum.
     - `diff`: Full JSON payload containing `before` and `after` snapshots for complete state change auditing.

2. **Audit Trapping Implementation**:
   ```typescript
   export async function recordAuditLog(params: {
     userId: string;
     entityType: string;
     entityId: string;
     action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT';
     reason?: string;
     before?: Record<string, any>;
     after?: Record<string, any>;
   }) {
     return await db.auditLog.create({
       data: {
         userId: params.userId,
         entityType: params.entityType,
         entityId: params.entityId,
         action: params.action,
         diff: {
           before: params.before ?? null,
           after: params.after ?? null,
         },
       },
     });
   }
   ```

---

## 3. Executive Portfolio Access Control Matrix

Executives (`GENERAL_MANAGER`, `MANAGING_DIRECTOR`, `CFO`, `CHIEF_ENGINEER`, `IT_ADMIN`) bypass individual `ProjectMembership` constraints to view all projects across the organization, enabling real-time executive dashboards for schedule, cost, physical progress, and risk monitoring.
