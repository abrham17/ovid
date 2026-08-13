import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ok, created, handleApiError, parseJson, fail } from "@/lib/api";
import { createContractSchema, createPlanSubmissionSchema, createOversightEntrySchema, createResourceRequestSchema, weightEntriesSchema } from "@/lib/validations/workflows";
import { createContract, listContracts, terminateContract } from "@/lib/services/contract.service";
import { listPlanSubmissions, createPlanSubmission, validatePlanSubmission, submitPlan, reviewPlan, withdrawPlan, getPlanSubmission } from "@/lib/services/wbs-plan.service";
import { setWbsNodeWeights, setActivityWeights, distributeWeightsEvenly } from "@/lib/services/weight.service";
import { assignOversight, listOversightAssignments, endOversight, reassignOversight } from "@/lib/services/oversight.service";
import { listOversightDailyEntries, createOversightDailyEntry, submitOversightDailyEntry, approveOversightDailyEntry } from "@/lib/services/oversight-daily.service";
import { listResourceRequests, createResourceRequest, reviewResourceRequest, cancelResourceRequest } from "@/lib/services/resource-request.service";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession(); const { projectId } = await ctx.params; const sp = new URL(req.url).searchParams; const kind = sp.get("kind") ?? "contracts";
    if (kind === "contracts") return ok(await listContracts(user, projectId));
    if (kind === "plans") return ok(await listPlanSubmissions(user, projectId));
    if (kind === "plan") return ok(await getPlanSubmission(user, sp.get("submissionId")!));
    if (kind === "oversight") return ok(await listOversightAssignments(user, projectId, { contractId: sp.get("contractId") ?? undefined, includeEnded: sp.get("includeEnded") === "true" }));
    if (kind === "oversight_daily") return ok(await listOversightDailyEntries(user, projectId, sp.get("contractId") ?? undefined));
    if (kind === "resource_requests") return ok(await listResourceRequests(user, projectId, sp.get("status") ?? undefined));
    return fail("Unknown workflow kind", 400);
  } catch (err) { return handleApiError(err); }
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_contract"), data: createContractSchema }),
  z.object({ action: z.literal("terminate_contract"), contractId: z.string().cuid(), replacementContractorOrgId: z.string().cuid().optional() }),
  z.object({ action: z.literal("create_plan"), data: createPlanSubmissionSchema }),
  z.object({ action: z.literal("validate_plan"), submissionId: z.string().cuid() }),
  z.object({ action: z.literal("submit_plan"), submissionId: z.string().cuid() }),
  z.object({ action: z.literal("review_plan"), submissionId: z.string().cuid(), decision: z.enum(["APPROVE", "REQUEST_REVISION", "REJECT"]), comments: z.string().optional() }),
  z.object({ action: z.literal("withdraw_plan"), submissionId: z.string().cuid() }),
  z.object({ action: z.literal("set_wbs_weights"), entries: weightEntriesSchema }),
  z.object({ action: z.literal("set_activity_weights"), wbsNodeId: z.string().cuid(), entries: weightEntriesSchema }),
  z.object({ action: z.literal("distribute_wbs_weights"), parentWbsNodeId: z.string().cuid() }),
  z.object({ action: z.literal("assign_oversight"), userId: z.string().cuid(), contractId: z.string().cuid() }),
  z.object({ action: z.literal("end_oversight"), assignmentId: z.string().cuid() }),
  z.object({ action: z.literal("reassign_oversight"), assignmentId: z.string().cuid(), newUserId: z.string().cuid() }),
  z.object({ action: z.literal("create_oversight_daily"), data: createOversightEntrySchema }),
  z.object({ action: z.literal("submit_oversight_daily"), entryId: z.string().cuid() }),
  z.object({ action: z.literal("approve_oversight_daily"), entryId: z.string().cuid() }),
  z.object({ action: z.literal("create_resource_request"), data: createResourceRequestSchema }),
  z.object({ action: z.literal("review_resource_request"), requestId: z.string().cuid(), decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().optional() }),
  z.object({ action: z.literal("cancel_resource_request"), requestId: z.string().cuid() }),
]);

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSession(); const { projectId } = await ctx.params; const body = schema.parse(await parseJson(req));
    switch (body.action) {
      case "create_contract": return created(await createContract(user, { ...body.data, projectId }));
      case "terminate_contract": return ok(await terminateContract(user, body.contractId, body.replacementContractorOrgId));
      case "create_plan": return created(await createPlanSubmission(user, projectId, body.data));
      case "validate_plan": return ok(await validatePlanSubmission(user, body.submissionId));
      case "submit_plan": return ok(await submitPlan(user, body.submissionId));
      case "review_plan": return ok(await reviewPlan(user, body.submissionId, body.decision, body.comments));
      case "withdraw_plan": return ok(await withdrawPlan(user, body.submissionId));
      case "set_wbs_weights": return ok(await setWbsNodeWeights(user, projectId, body.entries.map((e) => ({ wbsNodeId: e.id, weightPercent: e.weightPercent }))));
      case "set_activity_weights": return ok(await setActivityWeights(user, body.wbsNodeId, body.entries.map((e) => ({ activityId: e.id, weightPercent: e.weightPercent }))));
      case "distribute_wbs_weights": return ok(await distributeWeightsEvenly(user, projectId, body.parentWbsNodeId));
      case "assign_oversight": return created(await assignOversight(user, projectId, body));
      case "end_oversight": return ok(await endOversight(user, body.assignmentId));
      case "reassign_oversight": return ok(await reassignOversight(user, body.assignmentId, body.newUserId));
      case "create_oversight_daily": return created(await createOversightDailyEntry(user, projectId, body.data));
      case "submit_oversight_daily": return ok(await submitOversightDailyEntry(user, body.entryId));
      case "approve_oversight_daily": return ok(await approveOversightDailyEntry(user, body.entryId));
      case "create_resource_request": return created(await createResourceRequest(user, projectId, body.data));
      case "review_resource_request": return ok(await reviewResourceRequest(user, body.requestId, body.decision, body.reason));
      case "cancel_resource_request": return ok(await cancelResourceRequest(user, body.requestId));
    }
  } catch (err) { return handleApiError(err); }
}
