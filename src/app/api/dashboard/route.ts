import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/services/dashboard.service";
import { ok, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;

    const data = await getDashboardData({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      partyType: user.partyType,
      projectId,
    });

    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
