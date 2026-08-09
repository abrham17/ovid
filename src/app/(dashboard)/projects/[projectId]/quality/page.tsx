import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listQuality } from "@/lib/services/quality.service";
import { getWbsTree } from "@/lib/services/project.service";
import { QualityView } from "@/components/projects/views/quality-view";
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

export default async function QualityPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [data, tree, hints] = await Promise.all([
    listQuality(session, projectId),
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  // QC has no individual narrowing — create uses full org ceiling writable (= ALL for QC)
  const createEnabled =
    can(session.role, "quality", "create") &&
    (session.role === "QC_INSPECTOR" || hints.hasWritableScope);

  return (
    <QualityView
      projectId={projectId}
      itrs={data.itrs as any}
      defects={data.defects as any}
      punches={data.punches as any}
      wbsNodes={
        session.role === "QC_INSPECTOR"
          ? flattenWbs(tree as any[])
          : filterWritableWbsOptions(flattenWbs(tree as any[]), hints.writableWbsIds)
      }
      canCreate={createEnabled}
      canUpdate={can(session.role, "quality", "update") && (session.role === "QC_INSPECTOR" || hints.hasWritableScope)}
      canApprove={can(session.role, "quality", "approve")}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
