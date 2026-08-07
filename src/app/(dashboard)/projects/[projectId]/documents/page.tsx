import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listDocuments } from "@/lib/services/document.service";
import { getWbsTree } from "@/lib/services/project.service";
import { DocumentsView } from "@/components/projects/views/documents-view";
import { can } from "@/lib/permissions";

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
  const [documents, tree] = await Promise.all([
    listDocuments(session, projectId),
    getWbsTree(session, projectId),
  ]);

  return (
    <DocumentsView
      projectId={projectId}
      documents={documents as any}
      wbsNodes={flattenWbs(tree as any[])}
      canCreate={can(session.role, "document", "create")}
      canUpdate={can(session.role, "document", "update")}
      canApprove={can(session.role, "document", "approve")}
    />
  );
}
