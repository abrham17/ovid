import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkflowHub } from "@/components/projects/workflow-hub";
import { listContracts } from "@/lib/services/contract.service";
import { listPlanSubmissions } from "@/lib/services/wbs-plan.service";
import { listOversightAssignments } from "@/lib/services/oversight.service";
import { listResourceRequests } from "@/lib/services/resource-request.service";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession(); if (!session) redirect("/login");
  const { projectId } = await params;
  const [contracts, plans, oversight, requests] = await Promise.all([
    listContracts(session, projectId), listPlanSubmissions(session, projectId), listOversightAssignments(session, projectId), listResourceRequests(session, projectId),
  ]);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Project workflows</h1><p className="text-sm text-fg-muted">Contracts, plan approvals, oversight, and resource requests</p></div><WorkflowHub projectId={projectId} contracts={contracts as any} plans={plans as any} oversight={oversight as any} requests={requests as any} /></div>;
}
