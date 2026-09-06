import { requireSession } from "@/lib/auth";
import { ok, handleApiError } from "@/lib/api";
import { getCompanyDashboard } from "@/lib/services/company.service";
export async function GET() { try { return ok(await getCompanyDashboard(await requireSession())); } catch (e) { return handleApiError(e); } }
