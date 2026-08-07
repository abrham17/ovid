/**
 * Shared domain integrity rules for Ovid PMS services.
 * Keeps workflow transitions, date checks, and graph safety consistent.
 */

export class DomainError extends Error {
  status = 400;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "DomainError";
    if (statusCode) this.status = statusCode;
  }
}

export function assertDateOrder(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  label = "Dates"
) {
  if (!start || !end) return;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) {
    throw new DomainError(`${label}: invalid date value`);
  }
  if (e < s) {
    throw new DomainError(`${label}: end must be on or after start`);
  }
}

export function assertNonNegative(n: number | null | undefined, label: string) {
  if (n == null) return;
  if (Number.isNaN(n) || n < 0) {
    throw new DomainError(`${label} must be zero or positive`);
  }
}

export function assertProgressPercent(n: number | null | undefined) {
  if (n == null) return;
  if (Number.isNaN(n) || n < 0 || n > 100) {
    throw new DomainError("Progress must be between 0 and 100");
  }
}

/**
 * Enforce forward-only (or explicit allowed) status transitions.
 * `allowed[from]` lists valid next statuses. Same status is always allowed (no-op).
 */
export function assertStatusTransition(
  current: string,
  next: string,
  allowed: Record<string, readonly string[]>,
  entityLabel = "Status"
) {
  if (current === next) return;
  const nexts = allowed[current];
  if (!nexts) {
    throw new DomainError(`${entityLabel}: unknown current status "${current}"`);
  }
  if (!nexts.includes(next)) {
    throw new DomainError(
      `${entityLabel}: cannot move from ${current} to ${next}. Allowed: ${nexts.join(", ") || "none"}`
    );
  }
}

export const MEASUREMENT_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["CONSULTANT_QUERIED", "CERTIFIED"],
  CONSULTANT_QUERIED: ["SUBMITTED", "CERTIFIED"],
  CERTIFIED: ["PAID"],
  PAID: [],
};

export const VARIATION_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["CONTRACTOR_PREPARED"],
  CONTRACTOR_PREPARED: ["CONTRACTOR_CHECKED"],
  CONTRACTOR_CHECKED: ["CONSULTANT_CHECKED"],
  CONSULTANT_CHECKED: ["CONSULTANT_APPROVED", "REJECTED"],
  CONSULTANT_APPROVED: [],
  REJECTED: [],
};

export const DAILY_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "DRAFT"],
  APPROVED: [],
};

export const DEFECT_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["REWORK_IN_PROGRESS", "VERIFIED_CLOSED"],
  REWORK_IN_PROGRESS: ["VERIFIED_CLOSED", "OPEN"],
  VERIFIED_CLOSED: [],
};

export const PUNCH_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["RESOLVED"],
  RESOLVED: ["VERIFIED", "OPEN"],
  VERIFIED: [],
};

export const INCIDENT_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["ACTION_PENDING", "CLOSED"],
  ACTION_PENDING: ["CLOSED", "OPEN"],
  CLOSED: [],
};

export const DOC_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["ISSUED", "DRAFT", "WITHDRAWN"],
  ISSUED: ["SUPERSEDED", "WITHDRAWN"],
  SUPERSEDED: [],
  WITHDRAWN: [],
};

export const PO_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["ISSUED", "CANCELLED"],
  ISSUED: ["PARTIAL_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIAL_RECEIVED: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export const BID_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["WON", "LOST", "CANCELLED"],
  WON: [],
  LOST: [],
  CANCELLED: [],
};

export const RISK_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["MITIGATING", "CLOSED", "REALIZED"],
  MITIGATING: ["CLOSED", "REALIZED", "OPEN"],
  CLOSED: [],
  REALIZED: [],
};

export const ACTIVITY_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  NOT_STARTED: ["IN_PROGRESS", "ON_HOLD"],
  IN_PROGRESS: ["COMPLETE", "ON_HOLD", "NOT_STARTED"],
  ON_HOLD: ["IN_PROGRESS", "NOT_STARTED"],
  COMPLETE: [],
};

/** Detect if adding edge predecessor → successor would create a cycle. */
export function wouldCreateCycle(
  edges: Array<{ from: string; to: string }>,
  from: string,
  to: string
): boolean {
  if (from === to) return true;
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }
  // tentative edge
  if (!adj.has(from)) adj.set(from, []);
  adj.get(from)!.push(to);

  const visited = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === from) return true;
    if (visited.has(n)) continue;
    visited.add(n);
    for (const nxt of adj.get(n) ?? []) stack.push(nxt);
  }
  return false;
}
