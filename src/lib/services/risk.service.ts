import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { assertPermission, assertProjectAccess } from "@/lib/permissions";
import { DomainError, assertStatusTransition, RISK_TRANSITIONS } from "@/lib/domain-rules";
import type { CreateRiskInput, UpdateRiskInput } from "@/lib/validations/risk";
import {
  getEffectiveScope,
  assertScopeWritable,
  isAll,
  applyFieldRedaction,
} from "@/lib/scope";

/** Risk score = likelihood × impact (1–25). */
export function riskScore(likelihood: number, impact: number) {
  return likelihood * impact;
}

export function riskBand(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 16) return "CRITICAL";
  if (score >= 10) return "HIGH";
  if (score >= 5) return "MEDIUM";
  return "LOW";
}

export async function listRisks(user: SessionUser, projectId: string) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "risk", "read");

  const scope = await getEffectiveScope(user, projectId);

  const risks = await db.riskEntry.findMany({
    where: {
      projectId,
      ...(isAll(scope.visibleWbsNodeIds)
        ? {}
        : {
            OR: [
              { wbsNodeId: null },
              { wbsNodeId: { in: [...scope.visibleWbsNodeIds] } },
            ],
          }),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      wbsNode: { select: { id: true, code: true, name: true } },
      owner: { select: { id: true, fullName: true, role: true } },
      realizedAsStoppage: {
        select: { id: true, stoppageType: true, reason: true },
      },
      realizedAsVariation: {
        select: { id: true, itemNo: true, workDescription: true },
      },
    },
  });

  return risks.map((r) =>
    applyFieldRedaction(
      {
        ...r,
        score: riskScore(r.likelihood, r.impact),
        band: riskBand(riskScore(r.likelihood, r.impact)),
      } as any,
      scope
    )
  );
}

export async function createRisk(
  user: SessionUser,
  projectId: string,
  input: CreateRiskInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "risk", "create");

  const scope = await getEffectiveScope(user, projectId);
  if (input.wbsNodeId) {
    const wbs = await db.wbsNode.findFirst({
      where: { id: input.wbsNodeId, projectId },
    });
    if (!wbs) throw new Error("WBS node not found");
    assertScopeWritable(scope, input.wbsNodeId);
  }

  return db.riskEntry.create({
    data: {
      projectId,
      wbsNodeId: input.wbsNodeId ?? null,
      category: input.category,
      description: input.description,
      likelihood: input.likelihood,
      impact: input.impact,
      ownerId: input.ownerId,
      mitigationPlan: input.mitigationPlan ?? null,
      status: "OPEN",
    },
    include: {
      owner: { select: { id: true, fullName: true } },
      wbsNode: { select: { id: true, code: true, name: true } },
    },
  });
}

export async function updateRisk(
  user: SessionUser,
  projectId: string,
  riskId: string,
  input: UpdateRiskInput
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "risk", "update");

  const risk = await db.riskEntry.findFirst({
    where: { id: riskId, projectId },
  });
  if (!risk) throw new Error("Risk not found");

  if (input.status) {
    assertStatusTransition(risk.status, input.status, RISK_TRANSITIONS, "Risk status");
  }
  if (input.likelihood != null && (input.likelihood < 1 || input.likelihood > 5)) {
    throw new DomainError("Likelihood must be 1–5");
  }
  if (input.impact != null && (input.impact < 1 || input.impact > 5)) {
    throw new DomainError("Impact must be 1–5");
  }

  return db.riskEntry.update({
    where: { id: riskId },
    data: {
      category: input.category,
      description: input.description,
      likelihood: input.likelihood,
      impact: input.impact,
      ownerId: input.ownerId,
      mitigationPlan: input.mitigationPlan,
      status: input.status,
      wbsNodeId: input.wbsNodeId === undefined ? undefined : input.wbsNodeId,
      realizedAsStoppageId: input.realizedAsStoppageId,
      realizedAsVariationId: input.realizedAsVariationId,
    },
  });
}

/** Mark risk REALIZED and optionally link stoppage or VO. */
export async function realizeRisk(
  user: SessionUser,
  projectId: string,
  riskId: string,
  opts?: { stoppageId?: string; variationId?: string; autoCreateStoppage?: boolean }
) {
  await assertProjectAccess(user, projectId);
  assertPermission(user, "risk", "update");

  const risk = await db.riskEntry.findFirst({
    where: { id: riskId, projectId },
  });
  if (!risk) throw new Error("Risk not found");

  let createdStoppageId = opts?.stoppageId;

  if (opts?.autoCreateStoppage && !createdStoppageId) {
    const stoppage = await db.stoppageEntry.create({
      data: {
        projectId,
        wbsNodeId: risk.wbsNodeId,
        stoppageType: "OTHER",
        reason: `Realized Risk: ${risk.description}`,
        startTime: new Date(),
        endTime: new Date(),
      },
    });
    createdStoppageId = stoppage.id;
  }

  return db.riskEntry.update({
    where: { id: riskId },
    data: {
      status: "REALIZED",
      realizedAsStoppageId: createdStoppageId ?? risk.realizedAsStoppageId,
      realizedAsVariationId: opts?.variationId ?? risk.realizedAsVariationId,
    },
  });
}
