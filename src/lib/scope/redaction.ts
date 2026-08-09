import type { EffectiveScope } from "@/lib/scope/types";

type AnyRecord = Record<string, unknown>;

const COST_SENSITIVE_KEYS = new Set([
  "unitRate",
  "unit_rate",
  "contractValue",
  "contract_value",
  "amount",
  "committedAmount",
  "actualAmount",
  "margin",
  "retentionPercent",
  "retention_percent",
  "budgetedAmount",
]);

/**
 * Strip unit rates / margin / monetary amounts when user cannot view cost detail.
 * Keeps quantities, codes, descriptions, and status fields.
 */
export function redactCostEntity<T extends AnyRecord>(
  entity: T,
  scope: EffectiveScope
): T {
  if (scope.canViewCostDetail && scope.fieldMode === "full") {
    return entity;
  }

  const out = { ...entity } as AnyRecord;
  for (const key of Object.keys(out)) {
    if (COST_SENSITIVE_KEYS.has(key)) {
      out[key] = null;
    }
  }

  // Nested boq / contract shapes
  if (out.boqItem && typeof out.boqItem === "object") {
    out.boqItem = redactCostEntity(out.boqItem as AnyRecord, scope);
  }
  if (out.contract && typeof out.contract === "object" && !scope.canViewCostDetail) {
    const c = { ...(out.contract as AnyRecord) };
    if ("contractValue" in c) c.contractValue = null;
    if ("retentionPercent" in c) c.retentionPercent = null;
    out.contract = c;
  }

  return out as T;
}

export function redactCostList<T extends AnyRecord>(
  items: T[],
  scope: EffectiveScope
): T[] {
  return items.map((i) => redactCostEntity(i, scope));
}

/**
 * Client summary: keep progress, measurement status/certificate, pass-fail,
 * strip mitigation detail and monetary fields.
 */
export function redactForClient<T extends AnyRecord>(entity: T): T {
  const out = { ...entity } as AnyRecord;
  for (const key of COST_SENSITIVE_KEYS) {
    if (key in out) out[key] = null;
  }
  if ("mitigationPlan" in out) out.mitigationPlan = null;
  if ("mitigation" in out) out.mitigation = null;
  if ("detailedDescription" in out) out.detailedDescription = null;
  return out as T;
}

/**
 * Regulator: keep compliance-relevant fields only.
 */
export function redactForRegulator<T extends AnyRecord>(
  entity: T,
  _reportType?: string
): T {
  const keep = new Set([
    "id",
    "projectId",
    "status",
    "reportType",
    "severity",
    "incidentType",
    "result",
    "inspectionType",
    "date",
    "createdAt",
    "title",
    "code",
    "name",
    "progressPercent",
  ]);
  const out: AnyRecord = {};
  for (const [k, v] of Object.entries(entity)) {
    if (keep.has(k)) out[k] = v;
  }
  return out as T;
}

/** Apply fieldMode-aware redaction for generic list payloads. */
export function applyFieldRedaction<T extends AnyRecord>(
  entity: T,
  scope: EffectiveScope
): T {
  let result = redactCostEntity(entity, scope);
  if (scope.fieldMode === "client_summary") {
    result = redactForClient(result);
  } else if (scope.fieldMode === "regulator_compliance") {
    result = redactForRegulator(result);
  }
  return result;
}

export function applyFieldRedactionList<T extends AnyRecord>(
  items: T[],
  scope: EffectiveScope
): T[] {
  return items.map((i) => applyFieldRedaction(i, scope));
}
