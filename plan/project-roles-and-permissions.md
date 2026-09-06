# Project Roles and Permissions — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO/IEC 27001:2022 A.5.15–A.5.18 (Access control & privileged rights), ISO 9001:2015 §5.3 (Organizational roles & responsibilities), ISO 10006:2017 §6.1 (Resource management & responsibility allocation).
- **Principle**: Access permissions must be enforced server-side according to the principle of least privilege, strict segregation of duties (e.g. execution vs inspection vs approval), and full auditability of role assignments.

## 2. Where it Applies to Project Management
Applies across all user sessions, project workspace tabs, API routes, data fields, and administrative functions in the PMS platform.

## 3. What the Current Code Does
- `src/lib/permissions.ts` defines project-level and company-level permission matrices (`ROLE_PERMISSIONS`, `COMPANY_ROLE_PERMISSIONS`).
- `src/lib/scope.ts` calculates effective project scope (`writableWbsNodeIds`, `visibleWbsNodeIds`, `canViewCostDetail`, `scheduleReadMode`).
- `prisma/schema.prisma` has `UserRole` enum (19 global roles), `CompanyStaffRole` enum (12 executive roles), and `ProjectMembership` with `projectRole` (string).

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model User`, `model ProjectMembership`, `enum UserRole`, `enum CompanyStaffRole`)
- `src/lib/permissions.ts`
- `src/lib/scope.ts`
- `src/lib/auth.ts`
- `src/app/api/*`

## 5. Compliance Status
**Partially Compliant**

## 6. Exact Gap
1. `ProjectMembership.projectRole` is a free-text `String` rather than a strictly validated `enum ProjectRole`, leading to potential role mismatch during authorization checks.
2. No explicit immutable history table (`ProjectRoleAssignment`) capturing who assigned a user to a project role, when it became active, and when it ended.
3. No central machine-readable permission manifest (`route-permissions.json`) enforcing 100% backend REST endpoint permission validation.

## 7. Why the Gap Matters
Free-text project roles allow inconsistent permission evaluations. Without an immutable role assignment history table, an auditor cannot verify who possessed project approval authority on a given date. Unmapped API routes risk missing server-side authorization checks.

## 8. Required Architectural / Design Change
- Implement a centralized route permission manifest (`src/permissions/route-permissions.json`) that maps every REST endpoint + HTTP method to required domain permissions.
- Create an API route authorization wrapper (`assertRoutePermission(req, user)`) that validates requests against `route-permissions.json` before hitting handler logic.
- Convert `ProjectMembership.projectRole` to `enum ProjectRole`.

## 9. Required Database Change
Add `enum ProjectRole` and `model ProjectRoleAssignment` in `prisma/schema.prisma`:
```prisma
enum ProjectRole {
  PROJECT_MANAGER
  DEPUTY_PM
  SITE_ENGINEER
  SUPERINTENDENT
  FOREMAN
  QC_INSPECTOR
  HSE_OFFICER
  QUANTITY_SURVEYOR
  OFFICE_ENGINEER
  RESIDENT_ENGINEER
  CLIENT_REPRESENTATIVE
  SUBCONTRACTOR_PM
}

model ProjectRoleAssignment {
  id           String      @id @default(cuid())
  projectId    String
  userId       String
  role         ProjectRole
  assignedById String
  assignedAt   DateTime    @default(now())
  endedAt      DateTime?

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User    @relation("AssignedProjectUser", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy User    @relation("AssignedByProjectUser", fields: [assignedById], references: [id])

  @@index([projectId, userId, role, endedAt])
}
```

## 10. Required Backend / API Change
- Refactor `src/lib/permissions.ts` to support `ProjectRole` validation.
- Implement `assignProjectRole(user, projectId, targetUserId, role)` in `src/lib/services/assignment.service.ts` to automatically populate `ProjectRoleAssignment`.
- Ensure all API routes pass `assertRoutePermission()` before processing mutations.

## 11. Required Frontend / UI Change
- Update project team management UI (`src/components/projects/team-tab.tsx`) to render dropdowns sourced strictly from `ProjectRole`.
- Integrate `src/lib/permissions-client.ts` to disable/hide unauthorized UI controls.

## 12. Required Workflow Change
1. PM / Admin assigns user to a project.
2. System creates `ProjectMembership` and appends an active row to `ProjectRoleAssignment`.
3. Changing a user's role marks the old `ProjectRoleAssignment` record with `endedAt = now()` and inserts a new active row.

## 13. Dependencies
- Session and auth utilities (`src/lib/auth.ts`, `src/lib/permissions.ts`).
- Audit logger (`src/lib/services/audit.ts`).

## 14. Implementation Priority
**High (Phase 1)**

## 15. Acceptance / Verification Criteria
- All 14 schema domains and REST endpoints are mapped in `route-permissions.json`.
- Integration tests confirm that unauthorized HTTP requests receive a 403 Forbidden response.
- `ProjectRoleAssignment` accurately captures full timeline of user role changes.
