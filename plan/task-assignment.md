# Task assignment — lifecycle analysis and plan

Scope
Trace full task lifecycle from creation to closure and required ISO-aligned controls.

Current code & models
- ActivityAssignment / SectionAssignment relation types referenced in User model; ActivityAssignment model likely present in schema (see relations in User model). ScheduleActivity is the activity entity.
- No dedicated Task entity distinct from ScheduleActivity; tasks appear to be ScheduleActivity or WbsNode-level activities.

Findings
1. Assignment semantics unclear: ActivityAssignment relation exists but fields/metadata (assignedAt, dueDate, status, acceptance) not observed in inspected schema excerpt.
2. No acceptance/acknowledgement flow or read receipt for tasks.
3. No evidence of multi-responsible parties or role-level responsibility mapping (only assignedUser present in relations).
4. No standardized fields for planned vs actual hours per assignment, nor attachments per task (evidence), comments, or verification sign-offs integrated into activity lifecycle.

Required changes
- Introduce `TaskAssignment` model (if ActivityAssignment is insufficient) with fields: id, activityId, assignedById, assignedToId (allow multiple via link table), assignedAt, acceptAt, acceptedById, status (ASSIGNED, ACCEPTED, IN_PROGRESS, SUBMITTED_FOR_VERIFICATION, VERIFIED, CLOSED), plannedHours, actualHours, priority, dueDate, attachmentsJson, parentAssignmentId, escalationLevel.
- Introduce `TaskComment` and `TaskAttachment` models linking to assignments for evidence and discussion.
- Add sign-off / verification step using existing `SignOff` model; add `VerificationRequest` entity that creates SignOff entries.
- Implement API endpoints to accept, update progress, attach evidence, request verification, approve/close.
- Add audit trail entries via AuditLog whenever assignment is created, updated, accepted, verified, or closed.

Files & modules to change
- prisma/schema.prisma (TaskAssignment, TaskComment, TaskAttachment)
- src/lib/services/task-assignment.ts (new service to encapsulate lifecycle)
- src/app/api/projects/:id/activities/* (routes to create/assign/update activity assignments)
- src/lib/permissions.ts to define who can assign/verify/close tasks (project manager, foreman, QA, etc.)

Workflow changes
- Assignment flow: create assignment (ASSIGNED) → assigned user accepts (ACCEPTED) → reports progress (IN_PROGRESS) → submits for verification → verifier reviews & signs off → APPROVE → CLOSED.
- Escalation: after dueDate + gracePeriod, create notification and optionally escalate to accountableUser per ExecutiveIntervention model.

Priority
- Implement TaskAssignment and sign-off integration: high
- Attachments & comments: medium
- Escalation automation: medium

Verification
- Integration tests verify lifecycle transitions and permission enforcement.

