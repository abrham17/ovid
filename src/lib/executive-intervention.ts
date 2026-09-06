import type { ExecutiveInterventionStatus } from "@/generated/prisma/enums";

export type ManagementInterventionStatus =
  | "ACKNOWLEDGED"
  | "ACTION_IN_PROGRESS"
  | "READY_FOR_REVIEW";

const MANAGEMENT_TRANSITIONS: Record<
  ExecutiveInterventionStatus,
  readonly ManagementInterventionStatus[]
> = {
  OPEN: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["ACKNOWLEDGED", "ACTION_IN_PROGRESS"],
  ACTION_IN_PROGRESS: ["ACTION_IN_PROGRESS", "READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["ACTION_IN_PROGRESS", "READY_FOR_REVIEW"],
  CLOSED: [],
  CANCELLED: [],
};

export function canManagementTransitionIntervention(
  current: ExecutiveInterventionStatus,
  next: ManagementInterventionStatus
) {
  return MANAGEMENT_TRANSITIONS[current].includes(next);
}

export function canCloseExecutiveIntervention(
  current: ExecutiveInterventionStatus
) {
  return current === "READY_FOR_REVIEW";
}

export function isTerminalExecutiveIntervention(
  status: ExecutiveInterventionStatus
) {
  return status === "CLOSED" || status === "CANCELLED";
}
