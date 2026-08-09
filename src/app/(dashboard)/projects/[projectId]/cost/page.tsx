import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listCostOverview } from "@/lib/services/cost.service";
import { getWbsTree } from "@/lib/services/project.service";
import { CostView } from "@/components/projects/views/cost-view";
import { can } from "@/lib/permissions";
import { getScopeUiHints, filterWritableWbsOptions } from "@/lib/scope-ui";

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
  const [overview, tree, hints] = await Promise.all([
    listCostOverview(session, projectId),
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const showRates = overview.canViewCostDetail;
  const wbsNodes = filterWritableWbsOptions(
    flattenWbs(tree as any[]),
    hints.writableWbsIds
  );

  return (
    <CostView
      projectId={projectId}
      boqItems={overview.boqItems as any}
      measurements={overview.measurements as any}
      variations={overview.variations as any}
      contracts={overview.contracts as any}
      totals={{
        budgeted: overview.totals.budgeted ?? 0,
        committed: overview.totals.committed ?? 0,
        actual: overview.totals.actual ?? 0,
      }}
      wbsNodes={wbsNodes}
      canCreateCost={can(session.role, "cost", "create") && hints.hasWritableScope}
      canCreateMeasurement={
        can(session.role, "measurement", "create") && hints.hasWritableScope
      }
      canApproveMeasurement={
        can(session.role, "measurement", "approve") && hints.hasVisibleScope
      }
      canApproveCost={can(session.role, "cost", "approve") && hints.hasVisibleScope}
      showRates={showRates}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
