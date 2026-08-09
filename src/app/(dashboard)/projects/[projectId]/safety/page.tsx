import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listSafety } from "@/lib/services/safety.service";
import { getWbsTree } from "@/lib/services/project.service";
import { listActivities } from "@/lib/services/schedule.service";
import { SafetyView } from "@/components/projects/views/safety-view";
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

export default async function SafetyPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [data, tree, activities, hints] = await Promise.all([
    listSafety(session, projectId),
    getWbsTree(session, projectId),
    listActivities(session, projectId).catch(() => []),
    getScopeUiHints(session, projectId),
  ]);

  const isHse = session.role === "HSE_OFFICER";
  const createEnabled =
    can(session.role, "safety", "create") && (isHse || hints.hasWritableScope);

  return (
    <SafetyView
      projectId={projectId}
      observations={data.observations as any}
      incidents={data.incidents as any}
      wbsNodes={
        isHse
          ? flattenWbs(tree as any[])
          : filterWritableWbsOptions(flattenWbs(tree as any[]), hints.writableWbsIds)
      }
      activities={(activities as any[]).map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
      }))}
      canCreate={createEnabled}
      canUpdate={can(session.role, "safety", "update") && (isHse || hints.hasWritableScope)}
      canApprove={can(session.role, "safety", "approve")}
      scopeBanner={hints.banner}
      scopeEmptyTitle={hints.emptyTitle}
      scopeEmptyDescription={hints.emptyDescription}
    />
  );
}
