import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { created, handleApiError, ok, parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { reviewCompanyApproval } from "@/lib/services/company-approval.service";
import { reviewContractorOnboarding } from "@/lib/services/company.service";
import {
  createExecutiveIntervention,
  directExecutiveIntervention,
  getGeneralManagerDashboard,
  respondToExecutiveIntervention,
} from "@/lib/services/general-manager.service";
import { reviewProjectConversion } from "@/lib/services/tender.service";

const createSchema = z.object({
  action: z.literal("create-intervention"),
  projectId: z.string().cuid(),
  category: z.enum(["SCHEDULE", "COST", "SAFETY", "COMPLIANCE", "AUDIT", "CONTRACT", "RESOURCE", "OTHER"]),
  priority: z.enum(["MEDIUM", "HIGH", "CRITICAL"]),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4000),
  requiredAction: z.string().min(5).max(4000),
  accountableUserId: z.string().cuid(),
  dueAt: z.string().date(),
  sourceType: z.string().max(100).optional(),
  sourceId: z.string().max(200).optional(),
});

export async function GET() {
  try {
    return ok(await getGeneralManagerDashboard(await requireSession()));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await parseJson<Record<string, unknown>>(req);
    if (body.action === "create-intervention") return created(await createExecutiveIntervention(user, createSchema.parse(body)));
    if (body.action === "respond-intervention") return ok(await respondToExecutiveIntervention(user, z.string().cuid().parse(body.interventionId), z.object({ comment: z.string().min(3).max(4000), status: z.enum(["ACKNOWLEDGED", "ACTION_IN_PROGRESS", "READY_FOR_REVIEW"]) }).parse(body)));
    if (body.action === "direct-intervention") return ok(await directExecutiveIntervention(user, z.string().cuid().parse(body.interventionId), z.object({ comment: z.string().min(3).max(4000), status: z.enum(["OPEN", "ACTION_IN_PROGRESS", "CLOSED", "CANCELLED"]).optional(), dueAt: z.string().date().optional() }).parse(body)));
    if (body.action === "review-approval") {
      const approvalId = z.string().cuid().parse(body.approvalId);
      const approved = z.boolean().parse(body.approved);
      const comment = z.string().min(3).max(2000).parse(body.comment);
      const approval = await db.companyApproval.findFirst({ where: { id: approvalId, organizationId: user.organizationId, status: "PENDING" } });
      if (!approval) throw new Error("Pending approval not found");
      if (approval.type === "PROJECT_CREATION") return ok(await reviewProjectConversion(user, approvalId, approved, comment));
      if (approval.type === "CONTRACTOR_ONBOARDING") return ok(await reviewContractorOnboarding(user, approvalId, approved, comment));
      if (["EQUIPMENT_CAPITAL", "EXECUTIVE_CONTRACT", "EXECUTIVE_VARIATION"].includes(approval.type)) return ok(await reviewCompanyApproval(user, approvalId, approved, comment));
      throw new Error("This decision does not belong to the General Manager queue");
    }
    throw new Error("Unknown General Manager action");
  } catch (error) {
    return handleApiError(error);
  }
}
