import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { created, handleApiError, ok, parseJson } from "@/lib/api";
import {
  allocateEquipment,
  createAuditFinding,
  listAuditFindings,
  listDesignReviews,
  listLegalEscalations,
  releaseEquipment,
  reviewDesignSubmission,
  reviewLegalEscalation,
  submitDesignReview,
  updateAuditFinding,
} from "@/lib/services/company-governance.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSession();
    const kind = new URL(req.url).searchParams.get("kind");
    if (kind === "design") return ok(await listDesignReviews(user));
    if (kind === "legal") return ok(await listLegalEscalations(user));
    if (kind === "audit") return ok(await listAuditFindings(user));
    return ok([]);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const body = await parseJson<Record<string, unknown>>(req);
    if (body.action === "submit-design") return created(await submitDesignReview(user, z.object({ projectId: z.string().cuid(), wbsNodeId: z.string().cuid().optional(), title: z.string().min(3), documentRef: z.string().min(1), reviewType: z.string().min(2), safetyCritical: z.coerce.boolean() }).parse(body)));
    if (body.action === "review-design") return ok(await reviewDesignSubmission(user, z.string().cuid().parse(body.reviewId), z.object({ decision: z.enum(["APPROVED", "CHANGES_REQUIRED", "CLOSED"]), findings: z.unknown().optional(), resolution: z.string().max(4000).optional() }).parse(body)));
    if (body.action === "allocate-equipment") return created(await allocateEquipment(user, z.object({ equipmentId: z.string().cuid(), projectId: z.string().cuid(), allocatedFrom: z.string().date(), allocatedTo: z.string().date(), purpose: z.string().min(3) }).parse(body)));
    if (body.action === "release-equipment") return ok(await releaseEquipment(user, z.string().cuid().parse(body.allocationId)));
    if (body.action === "review-legal") return ok(await reviewLegalEscalation(user, z.string().cuid().parse(body.disputeId), z.object({ status: z.enum(["UNDER_REVIEW", "RESOLVED"]), resolution: z.string().min(3) }).parse(body)));
    if (body.action === "create-finding") return created(await createAuditFinding(user, z.object({ projectId: z.string().cuid().optional(), title: z.string().min(3), description: z.string().min(3), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), evidenceRef: z.string().optional(), remediationPlan: z.string().optional(), dueAt: z.string().date().optional(), ownerId: z.string().cuid().optional() }).parse(body)));
    if (body.action === "update-finding") return ok(await updateAuditFinding(user, z.string().cuid().parse(body.findingId), z.object({ status: z.enum(["OPEN", "REMEDIATION_IN_PROGRESS", "READY_FOR_VERIFICATION", "CLOSED"]), remediationPlan: z.string().optional(), managementReply: z.string().optional() }).parse(body)));
    throw new Error("Unknown company governance action");
  } catch (error) {
    return handleApiError(error);
  }
}
