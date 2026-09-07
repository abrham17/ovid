import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { recordProgressSnapshot } from "@/lib/services/progress.service";
import { assertProjectAccess } from "@/lib/permissions";
import { assertRoutePermission } from "@/lib/authorization";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id: projectId } = await params;
    await assertProjectAccess(user, projectId);
    assertRoutePermission(user, "POST", "/api/projects/:id/control-check");

    const snapshot = await recordProgressSnapshot(projectId, user.id);
    const spi = Number(snapshot.spi);

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

    return ok({ snapshot, createdInterventions });
  } catch (err) {
    return handleApiError(err);
  }
}
