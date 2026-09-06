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

  const canViewCost = can(session.role, "cost", "read") || can(session.role, "measurement", "read");
  if (!canViewCost) {
    redirect(`/projects/${projectId}/overview`);
  }

  const [overview, tree, hints] = await Promise.all([
    listCostOverview(session, projectId),
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const showRates = overview.canViewCostDetail;
  const clientOverview = JSON.parse(JSON.stringify(overview));
  const wbsNodes = filterWritableWbsOptions(
    flattenWbs(tree as any[]),
    hints.writableWbsIds
  );

  return (
    <CostView
      projectId={projectId}
      boqItems={clientOverview.boqItems}
      measurements={clientOverview.measurements}
      variations={clientOverview.variations}
      contracts={clientOverview.contracts}
      totals={{
        budgeted: clientOverview.totals.budgeted ?? 0,
        committed: clientOverview.totals.committed ?? 0,
        actual: clientOverview.totals.actual ?? 0,
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
