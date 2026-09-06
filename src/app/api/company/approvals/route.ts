import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { created, handleApiError, ok, parseJson } from "@/lib/api";
import { listCompanyApprovals, requestCompanyApproval, reviewCompanyApproval } from "@/lib/services/company-approval.service";
import { reviewProjectConversion } from "@/lib/services/tender.service";
import { reviewContractorOnboarding } from "@/lib/services/company.service";
import { db } from "@/lib/db";
const types = ["PROJECT_CREATION","CONTRACTOR_ONBOARDING","CONTRACT_TEMPLATE","HIGH_VALUE_CONTRACT","HIGH_VALUE_VARIATION","DESIGN_STANDARD","EQUIPMENT_CAPITAL","IPC_PAYMENT","EXECUTIVE_CONTRACT","EXECUTIVE_VARIATION"] as const;
export async function GET() { try { return ok(await listCompanyApprovals(await requireSession())); } catch (e) { return handleApiError(e); } }
export async function POST(req: NextRequest) { try { const user = await requireSession(); const body = await parseJson<any>(req); if (body.action === "review") { const approvalId = z.string().cuid().parse(body.approvalId); const approval = await db.companyApproval.findFirst({ where: { id: approvalId, organizationId: user.organizationId } }); if (!approval) throw new Error("Approval not found"); if (approval.type === "PROJECT_CREATION") return ok(await reviewProjectConversion(user, approvalId, Boolean(body.approved), body.comment)); if (approval.type === "CONTRACTOR_ONBOARDING") return ok(await reviewContractorOnboarding(user, approvalId, Boolean(body.approved), body.comment)); return ok(await reviewCompanyApproval(user, approvalId, Boolean(body.approved), body.comment)); } return created(await requestCompanyApproval(user, z.object({ type: z.enum(types), entityType: z.string().min(1), entityId: z.string().min(1), amount: z.number().nonnegative().optional(), comment: z.string().max(1000).optional(), thresholdSnapshot: z.unknown().optional() }).parse(body))); } catch (e) { return handleApiError(e); } }
