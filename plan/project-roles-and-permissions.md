# Project roles and permissions — deep analysis and plan

ISO references
- ISO/IEC 27002 A.9 Access control
- ISO/IEC 25010 Security functional suitability

What exists in code
- `prisma/schema.prisma` : User.role (UserRole enum) and ProjectMembership with projectRole (string)
- `src/lib/permissions.ts` : RBAC matrix and helpers
- `src/lib/permissions-client.ts` : utilities consumed by UI

Key findings
1. Dual model: Users carry a global UserRole and ProjectMembership stores a free-text projectRole. This can cause ambiguity when both apply.
2. Permissions are defined but there is no machine-readable route→permission manifest to ensure full coverage.
3. No immutable history of role assignments (who assigned, when, for how long).
4. Enforcement likely present in many routes but no automated verification to prove all mutating endpoints call assertPermission.

Concrete gaps
- Lack of project-scoped role enum and assignment history.
- Missing policy tests and route manifest to guarantee backend enforcement for all endpoints.
- UI-based hiding may be used; ensure backend authority enforcement.

Required changes
1. Consolidate role model
   - Add `enum ProjectRole` and change ProjectMembership.projectRole to ProjectRole
   - Add ProjectRoleAssignment history model to track assignments (added/ended/by whom)
2. Permission manifest
   - Introduce `src/permissions/route-permissions.json` that maps each API route to required permission(s)
   - Implement `src/lib/authorization.ts` wrapper to apply checks centrally
3. Tests
   - Add policy tests that iterate over manifest and attempt actions with users of each role to confirm allowed/forbidden outcomes.

Files to change
- prisma/schema.prisma (ProjectRole enum, ProjectRoleAssignment model)
- src/lib/permissions.ts (refactor to canonical policy format)
- src/lib/authorization.ts (new)
- src/permissions/route-permissions.json (new)
- tests/authorization/*.spec.ts (new)

Backend enforcement
- Require server-side checks in all API route handlers. Consider adding an eslint rule to enforce usage of authorization wrapper in route files.

Frontend
- Continue to use permissions-client.ts but base UI visibility on server-provided route-permission manifest for fail-safe behavior.

Priority and order
1. Add ProjectRole enum + assignment history (critical)
2. Implement central authorization wrapper and use in routes (critical)
3. Create route-permissions manifest and tests (high)

Verification
- Integration tests show unauthorized users cannot mutate protected resources even if UI shows buttons.
- Audit log records assignment events.

