import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listDailyReports } from "@/lib/services/daily.service";
import { getWbsTree } from "@/lib/services/project.service";
import { DailyReportsView } from "@/components/projects/views/daily-reports-view";
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

export default async function DailyPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [data, tree, hints] = await Promise.all([
    listDailyReports(session, projectId),
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const wbsNodes = filterWritableWbsOptions(
    flattenWbs(tree as any[]),
    hints.writableWbsIds
  );

  return (
    <DailyReportsView
      projectId={projectId}
      earthwork={data.earthwork as any}
      structure={data.structure as any}
      rebar={data.rebar as any}
      canCreate={can(session.role, "daily_report", "create") && hints.hasWritableScope}
      canApprove={can(session.role, "daily_report", "approve") && hints.hasVisibleScope}
      wbsNodes={wbsNodes}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
