import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWbsTree } from "@/lib/services/project.service";
import { WbsView } from "@/components/projects/views/wbs-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

export default async function WbsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const tree = await getWbsTree(session, projectId);

  return (
    <WbsView
      projectId={projectId}
      tree={tree as any}
      canCreate={can(session.role, "wbs", "create")}
      canUpdate={can(session.role, "wbs", "update")}
      canDelete={can(session.role, "wbs", "delete")}
    />
  );
}
