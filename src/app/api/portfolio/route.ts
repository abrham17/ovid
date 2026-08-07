import { requireSession } from "@/lib/auth";
import { getPortfolioDashboard } from "@/lib/services/dashboard.service";
import { ok, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireSession();
    const data = await getPortfolioDashboard(user);
    return ok(data);
  } catch (err) {
    return handleApiError(err);
  }
}
