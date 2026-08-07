import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyBadge } from "@/components/ui/party-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { WORKSPACE_TAB_LABELS, ROLE_LABELS } from "@/lib/constants";
import type { WorkspaceTab } from "@/lib/constants";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

type ProjectHeaderData = {
  id: string;
  name: string;
  code: string;
  status: string;
  projectType: string;
  contractType: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  contractValue?: number;
  contractorOrg: { name: string; contractorGrade?: string };
  clientOrg: { name: string };
  consultantOrg?: { name: string };
  userParty: { partyType: PartyType; projectRole: string };
  userRole: UserRole;
  allowedTabs: string[];
};

/**
 * Generic workspace module placeholder.
 * Each tab module will be replaced with its full implementation in later phases.
 */
export function ProjectTabModuleView({
  project,
  tab,
}: {
  project: ProjectHeaderData;
  tab: WorkspaceTab;
}) {
  const tabName = WORKSPACE_TAB_LABELS[tab] ?? tab;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">{tabName}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Viewing as:</span>
              <PartyBadge partyType={project.userParty.partyType} />
              <RoleBadge role={project.userRole} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Authorization context */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <h4 className="font-semibold text-slate-900">Access Context</h4>
            <ul className="mt-2 list-none space-y-1.5 text-xs text-slate-600">
              <li>
                <span className="font-medium text-slate-700">Party:</span>{" "}
                {project.userParty.partyType} — {project.userParty.projectRole}
              </li>
              <li>
                <span className="font-medium text-slate-700">Role:</span>{" "}
                {ROLE_LABELS[project.userRole]}
              </li>
              <li>
                <span className="font-medium text-slate-700">Module:</span>{" "}
                {tabName}
              </li>
              <li>
                <span className="font-medium text-slate-700">Project:</span>{" "}
                {project.code} — {project.name}
              </li>
              <li>
                <span className="font-medium text-slate-700">Contract Standard:</span>{" "}
                {project.contractType.replace(/_/g, " ")}
              </li>
            </ul>
          </div>

          {/* Module content placeholder */}
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">{tabName} Module</p>
              <p className="mt-1 text-xs text-slate-400">
                Full module implementation coming next.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
