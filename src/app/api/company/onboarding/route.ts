import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { created, handleApiError, ok, parseJson } from "@/lib/api";
import { proposeContractorOnboarding, reviewContractorOnboarding } from "@/lib/services/company.service";
const roles = ["SUBCONTRACTOR_PM","SENIOR_PM","DEPUTY_PM","OFFICE_ENGINEER"] as const;
export async function POST(req: NextRequest) { try { const user = await requireSession(); const body = await parseJson<any>(req); if (body.action === "review") return ok(await reviewContractorOnboarding(user, z.string().cuid().parse(body.approvalId), Boolean(body.approved), body.comment)); const input = z.object({ projectId: z.string().cuid(), contractorOrgId: z.string().cuid(), email: z.string().email(), fullName: z.string().min(2), jobTitle: z.string().min(1), role: z.enum(roles) }).parse(body); return created(await proposeContractorOnboarding(user, input)); } catch (e) { return handleApiError(e); } }
