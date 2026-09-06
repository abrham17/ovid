import { db } from '../db';

/**
 * Calculates physical progress for a leaf WBS node based on actual certified quantities
 * and approved daily field reports compared against budgeted BoQ quantities.
 */
export async function calculateLeafWbsProgress(wbsNodeId: string) {
  // Fetch leaf WBS node with its BoQ items and approved daily reports
  const wbsNode = await db.wbsNode.findUnique({
    where: { id: wbsNodeId },
    include: {
      boqItems: true,
      measurements: {
        where: { status: 'CERTIFIED' },
      },
      earthworkDailyEntries: {
        where: { status: 'APPROVED' },
      },
      structureDailyEntries: {
        where: { status: 'APPROVED' },
      },
      rebarDailyEntries: {
        where: { status: 'APPROVED' },
      },
    },
  });

  if (!wbsNode || wbsNode.boqItems.length === 0) {
    return { uncertifiedProgress: 0, certifiedProgress: 0, totalValue: 0 };
  }

  let totalBudgetedValue = 0;
  let totalCertifiedValue = 0;
  let totalFieldUncertifiedValue = 0;

  for (const boqItem of wbsNode.boqItems) {
    const budgetedQty = Number(boqItem.budgetedQuantity) || 1;
    const unitRate = Number(boqItem.unitRate) || 0;
    const boqValue = budgetedQty * unitRate;
    totalBudgetedValue += boqValue;

    // Sum certified quantities from IPC measurement entries
    const certifiedQty = wbsNode.measurements.reduce(
      (sum, m) => sum + Number(m.quantity),
      0
    );
    totalCertifiedValue += Math.min(certifiedQty, budgetedQty) * unitRate;

    // Sum daily field quantities
    const earthworkQty = wbsNode.earthworkDailyEntries.reduce(
      (sum, e) =>
        sum +
        (Number(e.quantityLength || 0) *
          Number(e.quantityWidth || 1) *
          Number(e.quantityDepth || 1)),
      0
    );

    const structureQty = wbsNode.structureDailyEntries.reduce(
      (sum, s) => sum + Number(s.actualQuantity || 0),
      0
    );

    const rebarQty = wbsNode.rebarDailyEntries.reduce(
      (sum, r) => sum + Number(r.computedWeightKg || 0),
      0
    );

    const totalFieldQty = earthworkQty + structureQty + rebarQty;
    totalFieldUncertifiedValue += Math.min(totalFieldQty, budgetedQty) * unitRate;
  }

  const certifiedProgress =
    totalBudgetedValue > 0 ? (totalCertifiedValue / totalBudgetedValue) * 100 : 0;

  const uncertifiedProgress =
    totalBudgetedValue > 0
      ? (totalFieldUncertifiedValue / totalBudgetedValue) * 100
      : 0;

  return {
    uncertifiedProgress: Math.min(100, Math.round(uncertifiedProgress * 100) / 100),
    certifiedProgress: Math.min(100, Math.round(certifiedProgress * 100) / 100),
    totalValue: totalBudgetedValue,
  };
}

/**
 * Bottom-up roll-up algorithm that calculates monetary value-weighted parent WBS progress
 * recursively from leaf nodes up to the root project level.
 */
export async function rollupParentWbsProgress(parentWbsNodeId: string): Promise<number> {
  const parentNode = await db.wbsNode.findUnique({
    where: { id: parentWbsNodeId },
    include: {
      children: true,
    },
  });

  if (!parentNode) return 0;

  // If leaf node, compute leaf progress directly
  if (parentNode.children.length === 0) {
    const leaf = await calculateLeafWbsProgress(parentWbsNodeId);
    return leaf.certifiedProgress;
  }

  // Calculate value-weighted sum across all child nodes
  let totalChildValue = 0;
  let weightedProgressSum = 0;

  for (const child of parentNode.children) {
    const childProgress = await rollupParentWbsProgress(child.id);
    const childStats = await calculateLeafWbsProgress(child.id);
    const childValue = childStats.totalValue || 1000; // default fallback weight

    totalChildValue += childValue;
    weightedProgressSum += childProgress * childValue;
  }

  const rolledUpProgress =
    totalChildValue > 0 ? weightedProgressSum / totalChildValue : 0;

  return Math.min(100, Math.round(rolledUpProgress * 100) / 100);
}
