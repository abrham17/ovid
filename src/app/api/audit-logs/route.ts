import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { assertRoutePermission } from "@/lib/authorization";
import { PermissionError } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    assertRoutePermission(user, "GET", "/api/audit-logs");

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
      throw new PermissionError("Only Internal Auditors or Corporate Executives can view audit logs");
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { changedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    return ok(logs);
  } catch (err) {
    return handleApiError(err);
  }
}
