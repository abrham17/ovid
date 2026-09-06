import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { apiError, apiResponse } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const isExecutive = user.companyRoles?.some((r) =>
      ["INTERNAL_AUDITOR", "GENERAL_MANAGER", "MANAGING_DIRECTOR"].includes(r)
    );
    if (user.role !== "ADMIN" && !isExecutive) {
      return apiError(new Error("Only Internal Auditors or Executives can view audit logs"), 403);
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { changedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    return apiResponse(logs);
  } catch (err) {
    return apiError(err);
  }
}
