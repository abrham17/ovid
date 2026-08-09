import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listRisks } from "@/lib/services/risk.service";
import { getWbsTree } from "@/lib/services/project.service";
import { RiskView } from "@/components/projects/views/risk-view";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { getScopeUiHints, filterWritableWbsOptions } from "@/lib/scope-ui";

type Props = { params: Promise<{ projectId: string }> };

function flattenWbs(nodes: any[], acc: { id: string; code: string; name: string }[] = []) {
  for (const n of nodes) {
    acc.push({ id: n.id, code: n.code, name: n.name });
    if (n.children?.length) flattenWbs(n.children, acc);
  }
  return acc;
}

export default async function RiskPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [risks, tree, memberships, hints] = await Promise.all([
    listRisks(session, projectId),
    getWbsTree(session, projectId),
    db.projectMembership.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    }),
    getScopeUiHints(session, projectId),
  ]);

  const owners = memberships.map((m) => m.user);

  return (
    <RiskView
      projectId={projectId}
      risks={risks as any}
      wbsNodes={filterWritableWbsOptions(flattenWbs(tree as any[]), hints.writableWbsIds)}
      owners={owners}
      canCreate={can(session.role, "risk", "create") && hints.hasWritableScope}
      canUpdate={can(session.role, "risk", "update") && hints.hasWritableScope}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
