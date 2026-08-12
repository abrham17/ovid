import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWbsTree } from "@/lib/services/project.service";
import { WbsView } from "@/components/projects/views/wbs-view";
import { SectionAssignmentsPanel } from "@/components/projects/views/section-assignments-panel";
import { listSectionAssignments } from "@/lib/services/section-assignment.service";
import { listProjectTeam } from "@/lib/services/invitation.service";
import { can } from "@/lib/permissions";
import { getScopeUiHints } from "@/lib/scope-ui";
import { isAll } from "@/lib/scope";

type Props = { params: Promise<{ projectId: string }> };

function flattenWbs(
  nodes: Array<{
    id: string;
    code: string;
    name: string;
    children?: unknown[];
  }>,
  depth = 0
): Array<{ id: string; code: string; name: string; depth: number }> {
  const out: Array<{ id: string; code: string; name: string; depth: number }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, code: n.code, name: n.name, depth });
    if (Array.isArray(n.children) && n.children.length) {
      out.push(...flattenWbs(n.children as typeof nodes, depth + 1));
    }
  }
  return out;
}

export default async function WbsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const canManageSectionAssignments =
    session.role === "SENIOR_PM" ||
    session.role === "DEPUTY_PM" ||
    session.role === "ADMIN";

  const [tree, hints, sectionAssignments, memberships] = await Promise.all([
    getWbsTree(session, projectId),
    getScopeUiHints(session, projectId),
    canManageSectionAssignments
      ? listSectionAssignments(session, projectId).catch(() => [])
      : Promise.resolve([]),
    canManageSectionAssignments
      ? listProjectTeam(session, projectId).catch(() => [])
      : Promise.resolve([]),
  ]);

  const roleCanCreate = can(session.role, "wbs", "create");
  const roleCanUpdate = can(session.role, "wbs", "update");
  const roleCanDelete = can(session.role, "wbs", "delete");

  return (
    <div className="space-y-8">
      <WbsView
        projectId={projectId}
        tree={tree as any}
        canCreate={roleCanCreate && hints.hasWritableScope}
        canUpdate={roleCanUpdate && hints.hasWritableScope}
        canDelete={roleCanDelete && isAll(hints.scope.writableWbsNodeIds)}
        canCreateRoot={roleCanCreate && isAll(hints.scope.writableWbsNodeIds)}
        scopeBanner={hints.banner}
        scopeEmptyTitle={hints.emptyTitle}
        scopeEmptyDescription={hints.emptyDescription}
      />
      {canManageSectionAssignments && (
        <SectionAssignmentsPanel
          projectId={projectId}
          assignments={sectionAssignments as any}
          members={memberships as any}
          wbsOptions={flattenWbs(tree as any)}
          canAssign={canManageSectionAssignments && can(session.role, "assignment", "create")}
        />
      )}
    </div>
  );
}
