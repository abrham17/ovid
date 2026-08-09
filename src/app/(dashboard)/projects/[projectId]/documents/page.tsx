import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listDocuments } from "@/lib/services/document.service";
import { getWbsTree } from "@/lib/services/project.service";
import { DocumentsView } from "@/components/projects/views/documents-view";
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

export default async function DocumentsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [documents, tree, hints] = await Promise.all([
    listDocuments(session, projectId),
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const wbsNodes = filterWritableWbsOptions(
    flattenWbs(tree as any[]),
    hints.writableWbsIds
  );

  return (
    <DocumentsView
      projectId={projectId}
      documents={documents as any}
      wbsNodes={wbsNodes}
      canCreate={can(session.role, "document", "create") && hints.hasWritableScope}
      canUpdate={can(session.role, "document", "update") && hints.hasWritableScope}
      canApprove={can(session.role, "document", "approve") && hints.hasVisibleScope}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
