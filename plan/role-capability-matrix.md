# PMS Role, View and Capability Assessment

## Authority model found in code

The effective UI/API behavior is the intersection of `User.role` permissions, party scope (`organization-scope.ts`), individual WBS/activity assignments (`individual-scope.ts`), membership/organization access (`permissions.ts`), and selected service-specific role sets. This is not yet a single policy engine: direct `user.role` checks and the unused route registry create drift. `ProjectMembership.projectRole` is a string and is not consistently used for authorization. Treat the **Current** columns below as observed server behavior, not the intended labels.

Legend: **R** read, **C** create, **U** update, **A** approve, **D** delete, **V** verify/sign-off, **-** no matrix permission. “Full” means full organization ceiling; “Scoped” means section/activity/contract scope where the scope service applies.

## Role x capability matrix

| Role | Project view | WBS / schedule | Daily / field | Cost / commercial | Quality / safety | Risk / docs | Team / assign | Approve / admin |
|---|---|---|---|---|---|---|---|---|
| FOREMAN | R, assigned-org fallback | R; schedule C, scoped activity | daily R/C/U; safety R/C | - | quality R; safety C | docs -; risk - | assignment R | no approval/admin |
| SUPERINTENDENT | R, assigned-org fallback | WBS R; schedule R/C/U, section scoped | daily R/C/U/A; safety R/C/U | - | quality R/C; safety A only via service-specific paths | docs -; risk - | team invitation R/C/D; assignment R/C/U | daily approval; no general admin |
| SITE_ENGINEER | R, assigned-org fallback | WBS R/U; schedule R/C/U, section scoped | daily R/C/U; safety R/C | - | quality R/C/U | docs R/C; risk - | assignment R/C/U | no general approval |
| DEPUTY_PM | R/U | WBS R/C/U; schedule R/C/U | daily A; field domains R/A | cost R/U; measurement R/C/U; variation R/C/U | quality/safety R/A | docs R/C/U/A; risk R/C/U | team R; assignment R/C/U | broad domain approvals; no company admin |
| SENIOR_PM | R/C/U | WBS/schedule R/C/U/D | daily A; all project domains broad | cost/measurement/variation R/C/U/A; contract R/C/U/A | quality/safety R/A | risk R/C/U/A; docs R/C/U/A | team and assignment R/C/U/D; invitation | broad project approvals; no independent segregation |
| QC_INSPECTOR | R | WBS/schedule R | daily R | - | quality R/C/U/A | docs R/C; risk - | - | can approve own quality records; no admin |
| HSE_OFFICER | R | schedule R | daily R; safety R/C/U/A | - | safety R/C/U/A | docs R/C; risk - | labor R | can approve own safety records; no admin |
| QS | R | WBS/schedule R | - | cost/measurement/variation R/C/U; procurement R | - | docs R/C; risk - | - | no matrix approval despite commercial responsibility |
| PROCUREMENT | R | schedule R | - | cost R; procurement R/C/U | - | docs R/C; risk - | - | no procurement approval in global matrix |
| FINANCE | R | - | - | cost R/C/U/A; measurement A; procurement A | - | docs R; risk - | - | can approve financial records; no independent reviewer rule |
| HR | R, broad org-linked | - | - | - | - | - | labor/team/invitation R/C/U/D | user/team administration, project data broad read |
| EQUIPMENT_MANAGER | R | schedule R | - | - | - | - | equipment R/C/U/D | equipment mutation without project role gate |
| CONTRACTS_LEGAL | R/U | - | - | cost R; variation R/C/U/A; contract R/C/U | - | docs R/C/U/A | - | variation/document approval; no SoD rule |
| CONSULTANT_ENGINEER | R, consultant ceiling | WBS/schedule R | - | cost R; measurement/variation A | quality R/A | docs R/A; risk - | - | external party can approve multiple domains |
| CLIENT_REP | R, client summary | schedule R | - | cost R; measurement/variation A | quality/safety R | docs R; risk R | - | external party approval without explicit project appointment gate |
| SUBCONTRACTOR_PM | R, contract/WBS scoped | WBS/schedule R/C/U, contract subtree | daily R/A; safety R/C | cost R | quality R; safety R/C | docs R/C; risk R/C | team R/C; invitation/assignment R/C/U/D | can approve daily reports but not independent verification |
| OFFICE_ENGINEER | R | WBS/schedule R | daily R/C/U | variation R/C/U; procurement R | - | docs R/C/U; risk R/C | assignment R/C/U | no approval |
| COMPANY_STAFF | R across org-linked projects | WBS/schedule R | daily/quality/safety R | cost/measurement/variation/procurement R | R | docs/risk/contract R | - | company role permissions govern company resources |
| ADMIN | all org-linked projects | all project domains R/C/U/D | all domains R/C/U/D/A | all domains R/C/U/D/A | all domains R/C/U/D/A | all domains R/C/U/D/A | all team/invitation/assignment admin | technical superuser; business approvals not segregated |

## ISO-aligned target capability principles

- **Project Manager:** accountable for integrated plan, controlled execution, status reporting and proposing changes; should not self-approve their own baseline, measurement, quality acceptance or audit finding.
- **Site Engineer/Foreman:** execute and report assigned work, attach evidence and request changes; should not edit approved baseline or approve their own completion.
- **QC/HSE:** independent verification and nonconformity/incident control; should be able to reject/hold work and verify corrective action, but not alter source progress or commercial values.
- **QS/Finance/Procurement:** separated preparation, checking, approval and payment authority with thresholds and conflict rules.
- **Consultant/Client:** see the contractual/approved information relevant to their appointment and approve defined deliverables, not obtain unrestricted organization-linked access.
- **Administrator:** technical identity/system administration only; business approvals require delegated company/project authority and are logged.
- **Company roles:** retain portfolio, tender, standards, finance, audit and executive capabilities, but add explicit project/organization scope and conflict-of-interest constraints.

## Role findings

1. **Global fallback access:** organization-linked users can access projects without membership (`permissions.ts:411-463`), so every role above may see more projects than its appointment warrants. Remediate under F-001.
2. **Project role is non-authoritative:** membership string is cast to `UserRole`, while most checks read global role. A user cannot safely have different project responsibilities. Remediate under F-002.
3. **Self-approval:** PM, consultant, finance, quality and admin matrix entries include `approve` without a generic “requester != approver” or threshold/independence rule. Baseline creation explicitly self-approves. Remediate under F-004 and F-010.
4. **Frontend-only risk:** `getVisibleTabs`/`workspace-tabs.ts` controls presentation, but direct API capability is service-dependent. Every role/capability pair requires API integration tests; hidden buttons are not authorization. Remediate under F-003.
5. **Over-broad ADMIN:** ADMIN can delete and approve nearly every project record. ISO-aligned design should split technical admin, business approver, auditor and emergency break-glass access. Remediate under F-002/F-010.
6. **External-party scope:** consultant/client party ceilings intentionally redact cost/operational detail, but access still starts from organization-linked projects and does not consistently require an active appointment. Remediate under F-001.

## Dashboard and view requirements

Role dashboards exist under `src/components/dashboards`, but the server must return a capability-and-scope model that drives them. Target views are: field execution (assigned activities, daily reports, safety and evidence); technical assurance (inspections, NCR/CAPA and design reviews); commercial (BoQ, measurements, variations, approvals); management (baseline/variance/risk/issues and interventions); external oversight (approved summaries, decisions and deliverables); and audit (read-only evidence/history). Each must redact fields server-side and show authority, as-of date and record status.

## Acceptance criteria

- Matrix decisions are enforced by API tests for every role and party type, including direct requests with guessed IDs.
- A user can hold different project appointments and only sees/changes the assigned scope.
- Requester, reviewer, approver and verifier are distinct where policy requires; conflicts are rejected and logged.
- Dashboard tabs are derived from server capabilities and cannot expand access.
- ADMIN cannot perform business approval unless separately assigned the relevant authority; break-glass actions require reason and enhanced audit.
