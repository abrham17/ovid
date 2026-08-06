import { redirect } from "next/navigation";
import { requireUser, type WorkspaceTab } from "@/lib/rbac";
import {
  getProjectWorkspaceHeader,
  getProjectOverviewDetails,
} from "@/lib/services/project.service";
import { getWbsWorkspaceData } from "@/lib/services/wbs.service";
import { getScheduleWorkspaceData } from "@/lib/services/schedule.service";

import { ProjectOverviewView } from "@/components/projects/views/project-overview-view";
import { WbsView } from "@/components/projects/views/wbs-view";
import { ScheduleView } from "@/components/projects/views/schedule-view";
import { ProjectTabModuleView } from "@/components/projects/views/project-tab-module-view";

import { ROLE_LABELS, WORKSPACE_TAB_LABELS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";

export default async function ProjectTabPage({
  params,
}: {
  params: Promise<{ id: string; tab: string }>;
}) {
  const user = await requireUser();
  const { id, tab } = await params;

  const project = await getProjectWorkspaceHeader(user, id);
  if (!project) redirect("/dashboard");

  const currentTab = tab as WorkspaceTab;

  // Guard: tab not in user's allowed set
  if (!project.allowedTabs.includes(currentTab)) {
    return (
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="py-10">
          <div className="text-center">
            <h3 className="text-base font-semibold text-amber-900">
              Module Access Restricted
            </h3>
            <p className="mt-2 text-sm text-amber-700">
              The{" "}
              <strong className="font-semibold">
                {WORKSPACE_TAB_LABELS[currentTab] ?? currentTab}
              </strong>{" "}
              module is not available for your access combination:
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <PartyBadge partyType={project.userParty.partyType} />
              <RoleBadge role={project.userRole} />
              <span className="text-xs text-amber-700">
                ({ROLE_LABELS[project.userRole]})
              </span>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              Your role ({ROLE_LABELS[project.userRole]}) within the{" "}
              {project.userParty.partyType} party does not have authorization
              for this workspace module. Use the sidebar to navigate to an
              allowed module.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentTab === "overview") {
    const stats = await getProjectOverviewDetails(user, id);
    return <ProjectOverviewView project={project} stats={stats} />;
  }

  if (currentTab === "wbs") {
    const wbsData = await getWbsWorkspaceData(user, id);
    if (!wbsData) redirect("/dashboard");
    return <WbsView data={wbsData} />;
  }

  if (currentTab === "schedule") {
    const scheduleData = await getScheduleWorkspaceData(user, id);
    if (!scheduleData) redirect("/dashboard");
    return <ScheduleView data={scheduleData} />;
  }

  return <ProjectTabModuleView project={project} tab={currentTab} />;
}
