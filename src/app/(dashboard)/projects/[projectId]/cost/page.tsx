import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listCostOverview } from "@/lib/services/cost.service";
import { getWbsTree } from "@/lib/services/project.service";
import { CostView } from "@/components/projects/views/cost-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

function flattenWbs(nodes: any[], acc: { id: string; code: string; name: string }[] = []) {
  for (const n of nodes) {
    acc.push({ id: n.id, code: n.code, name: n.name });
    if (n.children?.length) flattenWbs(n.children, acc);
  }
  return acc;
}

export default async function CostPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [overview, tree] = await Promise.all([
    listCostOverview(session, projectId),
    getWbsTree(session, projectId),
  ]);

  // Layer-1: hide rates from pure client/consultant viewing as non-contractor
  // (contractors, admin, QS, finance see rates)
  const showRates = !["CLIENT_REP", "CONSULTANT_ENGINEER"].includes(session.role) ||
    can(session.role, "cost", "create");

  return (
    <CostView
      projectId={projectId}
      boqItems={overview.boqItems as any}
      measurements={overview.measurements as any}
      variations={overview.variations as any}
      contracts={overview.contracts as any}
      totals={overview.totals}
      wbsNodes={flattenWbs(tree as any[])}
      canCreateCost={can(session.role, "cost", "create")}
      canCreateMeasurement={can(session.role, "measurement", "create")}
      canApproveMeasurement={can(session.role, "measurement", "approve")}
      canApproveCost={can(session.role, "cost", "approve")}
      showRates={showRates}
    />
  );
}
