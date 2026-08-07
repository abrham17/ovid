import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listResources } from "@/lib/services/resources.service";
import { getWbsTree } from "@/lib/services/project.service";
import { ResourcesView } from "@/components/projects/views/resources-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

function flattenWbs(nodes: any[], acc: { id: string; code: string; name: string }[] = []) {
  for (const n of nodes) {
    acc.push({ id: n.id, code: n.code, name: n.name });
    if (n.children?.length) flattenWbs(n.children, acc);
  }
  return acc;
}

export default async function ResourcesPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [data, tree] = await Promise.all([
    listResources(session, projectId),
    getWbsTree(session, projectId),
  ]);

  return (
    <ResourcesView
      projectId={projectId}
      employees={data.employees as any}
      assignments={data.assignments as any}
      equipment={data.equipment as any}
      usageLogs={data.usageLogs as any}
      utilizationPct={data.utilizationPct}
      hours={data.hours}
      wbsNodes={flattenWbs(tree as any[])}
      canLabor={can(session.role, "labor", "create")}
      canEquipment={can(session.role, "equipment", "create")}
    />
  );
}
