import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { recordProgressSnapshot } from "@/lib/services/progress.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    const { id: projectId } = await params;

    const snapshot = await recordProgressSnapshot(projectId);
    const spi = Number(snapshot.spi);
    const cpi = Number(snapshot.cpi);

    const createdInterventions = [];

    if (spi < 0.85) {
      const pmUser = await db.user.findFirst({
        where: { memberships: { some: { projectId } }, role: "SENIOR_PM" },
      });
      if (pmUser) {
        const intervention = await db.executiveIntervention.create({
          data: {
            organizationId: pmUser.organizationId,
            projectId,
            category: "SCHEDULE",
            priority: "CRITICAL",
            status: "OPEN",
            title: `Severe Schedule Variance (SPI = ${spi.toFixed(2)})`,
            description: `Project schedule performance index SPI=${spi.toFixed(2)} has fallen below tolerance threshold (0.85).`,
            requiredAction: "Submit formal Schedule Recovery Plan within 48 hours.",
            accountableUserId: pmUser.id,
            createdById: user.id,
            dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
        createdInterventions.push(intervention);
      }
    }

    return apiResponse({ snapshot, createdInterventions });
  } catch (err) {
    return apiError(err);
  }
}
