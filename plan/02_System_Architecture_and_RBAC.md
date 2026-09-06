# System Architecture & Role-Based Access Control (RBAC) Master Plan

## 1. Architectural Overview & ISO Compliance Baseline

The Ovid Project Management System (PMS) is a construction controls platform designed around **ISO 9001:2015** (Quality Management), **ISO 10006:2017** (Project Quality), **ISO 21502:2020** (Project Governance), **ISO/IEC 27001:2022** (Information Security Controls), and **FIDIC / Ethiopian Grade-1 MoUDC** construction standards.

The architecture enforces a strict 3-layer authorization model:
1. **Layer 1: Organization / Party Type** (`CONTRACTOR`, `CLIENT`, `CONSULTANT`, `SUBCONTRACTOR`, `SUPPLIER`, `REGULATOR`). Scope isolates tenant data across independent corporate entities.
2. **Layer 2: Functional & Executive Roles** (19 `UserRole` values + 12 `CompanyStaffRole` values + 13 `ProjectRole` values). Defines functional action permissions ($R, C, U, D, A$).
3. **Layer 3: WBS & Section Scope Isolation** (`SectionAssignment`, `OversightAssignment`, `Contract.scopeWbsNodeId`). Restricts field operations to specific WBS branches.

---

## 2. Server Enforcement & Security Layer Architecture

```
HTTP Request
   ↓
1. JWT Session Authentication (src/lib/auth.ts)
   ↓
2. Route Permission Validation (src/permissions/route-permissions.json & src/lib/authorization.ts)
   ↓
3. Project Access & Portfolio Scope Check (assertProjectAccess & src/lib/scope.ts)
   ↓
4. WBS Section Writable Scope Enforcement (assertScopeWritable)
   ↓
5. Business Logic Mutation Execution (src/lib/services/*)
   ↓
6. Centralized Audit Log Capture (logAuditEntry in src/lib/services/audit.ts)
```

### Key Enforcement Points
1. **Authentication**: Enforced via `getSessionUser(req)` validating httpOnly JWT cookies (`jose` package).
2. **Route Authorization**: Enforced via `assertRoutePermission(user, method, routePattern)` against machine-readable manifest `src/permissions/route-permissions.json`.
3. **Project Membership**: Enforced via `assertProjectAccess(user, projectId)`.
4. **Scope Isolation**: Enforced via `assertScopeWritable(scope, wbsNodeId)`.
5. **Audit Logging**: Every mutation logs `{ before: Json | null, after: Json | null }` diffs into `AuditLog`.

---

## 3. Mandatory Segregation of Duties (SoD) Rules

| ISO Control Rule | Required Segregation | Code Enforcement Location |
| :--- | :--- | :--- |
| **Quality Independence Gate** | Execution roles (`FOREMAN`, `SITE_ENGINEER`) cannot pass ITRs or close defects. Only `QC_INSPECTOR` or `CONSULTANT_ENGINEER` can verify closure. | `src/lib/services/quality.service.ts` (`updateDefectStatus`) |
| **Financial Approval Gate** | Quantity Surveyors (`QS`) draft measurements; only `FINANCE_DEPT_MANAGER` or `GENERAL_MANAGER` can certify payment disbursements. | `src/lib/services/cost.service.ts` & `company-approval.service.ts` |
| **Schedule Baseline Protection** | Frontline field roles cannot edit planned activity dates on active projects. Date updates require `ScheduleChangeRequest` approved by `SENIOR_PM` or `HEAD_PLANNING_MONITORING`. | `src/lib/services/schedule.service.ts` |
| **Subcontractor Plan Isolation** | Subcontractors create WBS nodes in `DRAFT` status under `WbsPlanSubmission`. DRAFT nodes remain invisible to live project progress rollups until approved by Main Contractor PM. | `src/lib/services/wbs-plan.service.ts` & `src/lib/weight-math.ts` |
| **Admin Separation of Duty** | Technical `ADMIN` manages user credentials and system config, but cannot perform business sign-offs (e.g. approving variation orders or IPCs). | `src/lib/permissions.ts` (`ROLE_PERMISSIONS`) |

---

## 4. Implementation Verification Strategy

1. **Permission Integration Tests**: Validate that unauthorized HTTP requests receive a 403 Forbidden response across all endpoints.
2. **Audit Verification**: Confirm every CRUD service function writes pre/post state snapshots to `AuditLog`.
3. **Decimal Component Props Protection**: Ensure `Prisma.Decimal` instances are converted to number/string types prior to passing as props to Client Components.
