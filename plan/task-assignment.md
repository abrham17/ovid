# Task Creation and Assignment — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §7.3 (Work assignment and delegation), ISO 9001:2015 §5.3 (Organizational roles and responsibilities), ISO 10006:2017 §6.1 (Resource allocation).
- **Principle**: Every task or activity must have a single accountable responsible party (`SITE_ENGINEER_OWNER`, `FOREMAN`, `SUBCONTRACTOR_OWNER`), clear start/finish deadlines, assigned resources, and a complete audit trail covering task delegation, acceptance, and progress updates.

## 2. Where it Applies to Project Management
Applies to work allocation, daily site assignments, site engineer section responsibilities, and subcontractor task execution.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `ActivityAssignment` (`scheduleActivityId`, `userId`, `role`, `assignedById`, `assignedAt`, `endedAt`, `supersededById`) and `SectionAssignment` (`projectId`, `userId`, `wbsNodeId`, `role`).
- Mutation services `assignment.service.ts` and `section-assignment.service.ts` manage task assignment lifecycles.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model ScheduleActivity`, `model ActivityAssignment`, `model SectionAssignment`)
- `src/lib/services/assignment.service.ts`
- `src/lib/services/section-assignment.service.ts`
- `src/lib/scope.ts`
- `src/app/api/projects/[id]/activities/[activityId]/assign/route.ts`

## 5. Compliance Status
**Fully Aligned (Assignment Data Model)** / **Partially Compliant (Notification Dispatches & Scope Checks)**

## 6. Exact Gap
1. Reassigning an activity or section does not automatically dispatch a real-time `Notification` (`ACTIVITY_ASSIGNED`) to the new assignee.
2. Frontline roles (`FOREMAN`, `SITE_ENGINEER`) are not strictly prevented from modifying activities outside their assigned WBS scope.

## 7. Why the Gap Matters
Failing to notify assignees leads to delayed task initiation and schedule slippage. Allowing out-of-scope edits violates ISO 27001 least-privilege security boundaries.

## 8. Required Architectural / Design Change
- Integrate `notification.service.ts` directly into `assignment.service.ts` and `section-assignment.service.ts` to dispatch `ACTIVITY_ASSIGNED` notifications upon task delegation.
- Enforce `assertScopeWritable(scope, wbsNodeId)` in all activity assignment mutation functions.

## 9. Required Database Change
- Existing `ActivityAssignment` and `SectionAssignment` schema models are fully aligned and support assignment history chains.

## 10. Required Backend / API Change
- Update `assignActivity()` in `src/lib/services/assignment.service.ts`:
```typescript
export async function assignActivity(...) {
  // 1. Supersede old active assignment
  // 2. Create new ActivityAssignment
  // 3. Dispatch Notification
  await createNotification({
    userId: targetUserId,
    projectId,
    entityType: "activity",
    entityId: activityId,
    type: "ACTIVITY_ASSIGNED",
    message: `You have been assigned as ${role} for activity "${activity.name}"`,
  });
}
```

## 11. Required Frontend / UI Change
- Update "My Tasks" view (`src/components/dashboards/foreman-dashboard.tsx`) to query activities where `ActivityAssignment.userId == currentUserId` and `endedAt == null`.

## 12. Required Workflow Change
1. Senior PM or Site Engineer assigns an activity to a Foreman.
2. System supersedes old assignment, creates new `ActivityAssignment` row, logs audit diff, and sends notification to Foreman.
3. Foreman sees task in "My Tasks" widget.

## 13. Dependencies
- Scope enforcement service (`src/lib/scope.ts`).
- Notification service (`src/lib/services/notification.service.ts`).

## 14. Implementation Priority
**Medium (Phase 3)**

## 15. Acceptance / Verification Criteria
- Assigning an activity creates an `ActivityAssignment` row and inserts a `Notification` record in a single database transaction.
- Frontline users receive a 403 Forbidden error when attempting to assign tasks outside their assigned WBS section.
