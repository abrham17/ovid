import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listActivities } from "@/lib/services/schedule.service";
import { listStoppages } from "@/lib/services/stoppage.service";
import { getWbsTree } from "@/lib/services/project.service";
import { ScheduleView } from "@/components/projects/views/schedule-view";
import { can } from "@/lib/permissions";

type Props = { params: Promise<{ projectId: string }> };

type WbsNodeDTO = { id: string; code: string; name: string };

type ActivityDTO = {
  id: string;
  wbsNodeId: string;
  name: string;
  baselineStart: string | null;
  baselineFinish: string | null;
  plannedStart: string | null;
  plannedFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  progressPercent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  wbsNode: { id: string; code: string; name: string } | null;
  stoppages: Array<{
    id: string;
    stoppageType: string;
    reason: string;
    startTime: string;
    endTime: string;
    responsibleParty: string | null;
  }>;
  _count: { stoppages: number };
};

type StoppageDTO = {
  id: string;
  stoppageType: string;
  reason: string;
  stationFrom: string | null;
  stationTo: string | null;
  startTime: string;
  endTime: string;
  inspectorComment: string | null;
  contractorRepComment: string | null;
  residentEngineerComment: string | null;
  responsibleParty: string | null;
  wbsNode: { id: string; code: string; name: string } | null;
  scheduleActivity: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

function flattenWbs(nodes: any[], acc: WbsNodeDTO[] = []): WbsNodeDTO[] {
  for (const n of nodes) {
    acc.push({ id: n.id, code: n.code, name: n.name });
    if (n.children?.length) flattenWbs(n.children, acc);
  }
  return acc;
}

function serializeActivity(activity: any): ActivityDTO {
  return {
    id: activity.id,
    wbsNodeId: activity.wbsNodeId,
    name: activity.name,
    baselineStart: activity.baselineStart?.toISOString() ?? null,
    baselineFinish: activity.baselineFinish?.toISOString() ?? null,
    plannedStart: activity.plannedStart?.toISOString() ?? null,
    plannedFinish: activity.plannedFinish?.toISOString() ?? null,
    actualStart: activity.actualStart?.toISOString() ?? null,
    actualFinish: activity.actualFinish?.toISOString() ?? null,
    progressPercent: Number(activity.progressPercent ?? 0),
    status: activity.status,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
    wbsNode: activity.wbsNode,
    stoppages: activity.stoppages?.map((s: any) => ({
      id: s.id,
      stoppageType: s.stoppageType,
      reason: s.reason,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      responsibleParty: s.responsibleParty,
    })) ?? [],
    _count: activity._count,
  };
}

function serializeStoppage(stoppage: any): StoppageDTO {
  return {
    id: stoppage.id,
    stoppageType: stoppage.stoppageType,
    reason: stoppage.reason,
    stationFrom: stoppage.stationFrom ?? null,
    stationTo: stoppage.stationTo ?? null,
    startTime: stoppage.startTime.toISOString(),
    endTime: stoppage.endTime.toISOString(),
    inspectorComment: stoppage.inspectorComment ?? null,
    contractorRepComment: stoppage.contractorRepComment ?? null,
    residentEngineerComment: stoppage.residentEngineerComment ?? null,
    responsibleParty: stoppage.responsibleParty ?? null,
    wbsNode: stoppage.wbsNode ?? null,
    scheduleActivity: stoppage.scheduleActivity ?? null,
    createdAt: stoppage.createdAt.toISOString(),
    updatedAt: stoppage.updatedAt.toISOString(),
  };
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

  const serializedActivities = activities.map(serializeActivity);
  const serializedStoppages = stoppages.map(serializeStoppage);

  return (
    <ScheduleView
      projectId={projectId}
      activities={serializedActivities}
      stoppages={serializedStoppages}
      wbsNodes={flattenWbs(tree)}
      canCreate={can(session.role, "schedule", "create")}
      canApprove={can(session.role, "schedule", "approve")}
    />
  );
}
