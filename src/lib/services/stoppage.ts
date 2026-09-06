import { db } from '../db';

export interface StoppageStandingCostInput {
  stoppageId: string;
  equipmentIdleHours: number;
  equipmentIdleRateETB: number; // e.g. ETB 1,500/hr
  laborStandbyHours: number;
  laborStandbyRateETB: number; // e.g. ETB 200/hr
  userId: string;
}

/**
 * Calculates financial standing costs for a work stoppage and checks if the delay
 * generates an automatic FIDIC Extension of Time (EOT) claim candidate.
 */
export async function processStoppageStandingCost(input: StoppageStandingCostInput) {
  const stoppage = await db.stoppageEntry.findUnique({
    where: { id: input.stoppageId },
    include: {
      project: true,
      scheduleActivity: true,
    },
  });

  if (!stoppage) {
    throw new Error('Stoppage entry not found');
  }

  const equipmentCost = input.equipmentIdleHours * input.equipmentIdleRateETB;
  const laborCost = input.laborStandbyHours * input.laborStandbyRateETB;
  const totalStandingCost = equipmentCost + laborCost;

  // Compute delay duration in days
  const durationMs = stoppage.endTime.getTime() - stoppage.startTime.getTime();
  const delayDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

  // If stoppage is caused by Client or Consultant, auto-generate FIDIC Claim candidate
  let createdClaim = null;
  if (
    stoppage.responsibleParty === 'CLIENT' ||
    stoppage.responsibleParty === 'CONSULTANT'
  ) {
    const contract = await db.contract.findFirst({
      where: { projectId: stoppage.projectId },
    });

    if (contract) {
      createdClaim = await db.contractClaim.create({
        data: {
          contractId: contract.id,
          claimNo: `CLM-STOP-${Date.now().toString().slice(-6)}`,
          causeOfClaim: `Work Stoppage: ${stoppage.reason} (FIDIC Clause 8.4)`,
          noticeDate: new Date(),
          financialClaimAmount: totalStandingCost,
          timeExtensionDays: delayDays,
          status: 'NOTIFIED',
          initiatedByUserId: input.userId,
        },
      });
    }
  }

  return {
    stoppageId: stoppage.id,
    equipmentCost,
    laborCost,
    totalStandingCost,
    delayDays,
    createdClaim,
  };
}
