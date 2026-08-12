/**
 * Pure (no DB) completion-weight math for the weighted WBS rollup (file 20 §2).
 * Safe to import in client components — mirrors the schedule-status.ts pattern.
 *
 * The "100% Rule": for any parent, the weightPercent of its direct children must
 * sum to 100. File 10 §2.3 stated this as a design principle; here it becomes a
 * literal, enforced validation.
 */

/**
 * Sibling weights must sum to 100 within this tolerance. A small tolerance
 * avoids false rejections from rounding when many small activities divide a
 * node (file 20 §7) — stored values are still normalized to exactly 100 on save,
 * so the tolerance only ever forgives input noise, never accumulates drift.
 */
export const WEIGHT_TOLERANCE = 0.5;

/** Decimal places weightPercent is stored at (matches Decimal(7,4) in the schema). */
export const WEIGHT_DP = 4;

export type Weighted = {
  id: string;
  weightPercent: number | null;
};

function round(value: number, dp = WEIGHT_DP): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

export type SiblingSumCheck = {
  /** Sum of the explicitly-set weights only. */
  sum: number;
  /** True when every sibling is unweighted (legacy / not yet planned). */
  allUnweighted: boolean;
  /** True when some but not all siblings carry a weight. */
  partiallyWeighted: boolean;
  /** Whether the set satisfies the 100% Rule within tolerance. */
  ok: boolean;
  /** 100 - sum; positive means under-allocated, negative means over-allocated. */
  shortfall: number;
};

/**
 * Check one sibling set against the 100% Rule.
 *
 * An entirely unweighted set is reported as `ok` — it is a legacy or
 * not-yet-planned node, and the rollup falls back to equal weighting rather
 * than scoring it zero. A *partially* weighted set is never ok: it means someone
 * started allocating and stopped, which is exactly the accidental
 * partial-decomposition that file 20 §3.2 wants caught at submission time.
 */
export function checkSiblingSum(
  siblings: Weighted[],
  tolerance = WEIGHT_TOLERANCE
): SiblingSumCheck {
  const explicit = siblings.filter((s) => s.weightPercent != null);
  const allUnweighted = explicit.length === 0;
  const partiallyWeighted = explicit.length > 0 && explicit.length < siblings.length;
  const sum = round(
    explicit.reduce((acc, s) => acc + Number(s.weightPercent), 0)
  );

  if (siblings.length === 0) {
    return { sum: 0, allUnweighted: true, partiallyWeighted: false, ok: true, shortfall: 0 };
  }
  if (allUnweighted) {
    return { sum: 0, allUnweighted, partiallyWeighted, ok: true, shortfall: 100 };
  }

  const shortfall = round(100 - sum);
  return {
    sum,
    allUnweighted,
    partiallyWeighted,
    ok: !partiallyWeighted && Math.abs(shortfall) <= tolerance,
    shortfall,
  };
}

/**
 * Resolve a sibling set into normalized fractions that sum to exactly 1, for use
 * as rollup multipliers.
 *
 * Fallback ladder, so a rollup never silently reports 0% because planning is
 * incomplete:
 *   - all unweighted  → equal shares
 *   - partly weighted → explicit keep their declared share; the unweighted split
 *                       whatever is left of 100 between them
 *   - anything left over after that is normalized away, so an over-allocated set
 *     (siblings summing to 120) cannot push a parent above its true ceiling
 */
export function resolveSiblingWeights(siblings: Weighted[]): Map<string, number> {
  const out = new Map<string, number>();
  if (siblings.length === 0) return out;

  const equalShare = () => {
    const each = 1 / siblings.length;
    for (const s of siblings) out.set(s.id, each);
    return out;
  };

  const explicit = siblings.filter((s) => s.weightPercent != null);
  if (explicit.length === 0) return equalShare();

  const explicitTotal = explicit.reduce(
    (acc, s) => acc + Math.max(0, Number(s.weightPercent)),
    0
  );
  const unweighted = siblings.filter((s) => s.weightPercent == null);
  const remainder = Math.max(0, 100 - explicitTotal);
  const unweightedEach = unweighted.length > 0 ? remainder / unweighted.length : 0;

  const raw = new Map<string, number>();
  for (const s of explicit) raw.set(s.id, Math.max(0, Number(s.weightPercent)));
  for (const s of unweighted) raw.set(s.id, unweightedEach);

  const total = [...raw.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return equalShare();

  for (const [id, w] of raw) out.set(id, w / total);
  return out;
}

/**
 * Normalize a sibling set to sum to exactly 100, rounded to WEIGHT_DP.
 *
 * The rounding remainder is absorbed by the largest sibling so the stored total
 * is exact rather than 99.9999 — file 20 §7's "tolerate on input, normalize on
 * save" recommendation.
 */
export function normalizeToHundred(siblings: Weighted[]): Map<string, number> {
  const out = new Map<string, number>();
  if (siblings.length === 0) return out;

  const fractions = resolveSiblingWeights(siblings);
  let running = 0;
  let largestId = siblings[0].id;
  let largestValue = -1;

  for (const s of siblings) {
    const value = round((fractions.get(s.id) ?? 0) * 100);
    out.set(s.id, value);
    running = round(running + value);
    if (value > largestValue) {
      largestValue = value;
      largestId = s.id;
    }
  }

  const drift = round(100 - running);
  if (drift !== 0) {
    out.set(largestId, round((out.get(largestId) ?? 0) + drift));
  }
  return out;
}

/**
 * Weighted average of children's progress, using resolved sibling weights.
 * This is the single arithmetic step of the rollup in file 20 §2.3, applied
 * identically to WBS children and to a leaf node's activities.
 */
export function weightedProgress(
  children: Array<Weighted & { progressPercent: number }>
): number {
  if (children.length === 0) return 0;
  const weights = resolveSiblingWeights(children);
  const sum = children.reduce(
    (acc, c) => acc + (weights.get(c.id) ?? 0) * c.progressPercent,
    0
  );
  return Math.round(sum * 100) / 100;
}
