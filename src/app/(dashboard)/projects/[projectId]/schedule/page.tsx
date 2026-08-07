import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listActivities } from "@/lib/services/schedule.service";
import { listStoppages } from "@/lib/services/stoppage.service";
import { getWbsTree } from "@/lib/services/project.service";
import { ScheduleView } from "@/components/projects/views/schedule-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

function flattenWbs(nodes: any[], acc: { id: string; code: string; name: string }[] = []) {
  for (const n of nodes) {
    acc.push({ id: n.id, code: n.code, name: n.name });
    if (n.children?.length) flattenWbs(n.children, acc);
  }
  return acc;
}

export default async function SchedulePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [activities, stoppages, tree] = await Promise.all([
    listActivities(session, projectId),
    listStoppages(session, projectId),
    getWbsTree(session, projectId),
  ]);

  return (
    <ScheduleView
      projectId={projectId}
      activities={activities as any}
      stoppages={stoppages as any}
      wbsNodes={flattenWbs(tree as any[])}
      canCreate={can(session.role, "schedule", "create")}
      canApprove={can(session.role, "schedule", "approve")}
    />
  );
}
