import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProject } from "@/lib/services/project.service";
import { ProjectHeaderNav } from "@/components/projects/project-header-nav";
import { PermissionError } from "@/lib/permissions";
import { getAllowedTabs, resolveProjectParty } from "@/lib/workspace-tabs";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

type Props = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;

  let project;
  try {
    project = await getProject(session, projectId);
  } catch (err) {
    if (err instanceof PermissionError) {
      redirect("/projects");
    }
    notFound();
  }

  // Compute workspace tabs from role permissions
  const allowedTabs = getAllowedTabs(session.role);

  // Resolve user's party in context of this project
  const userParty = {
    partyType: resolveProjectParty(
      session.partyType,
      session.organizationId,
      project
    ) as any,
    projectRole: session.role,
  };

  const sidebarProject = {
    id: projectId,
    name: project.name,
    code: project.code,
    status: project.status,
    projectType: project.projectType,
    contractType: project.contractType,
    plannedStartDate: project.plannedStartDate,
    plannedEndDate: project.plannedEndDate,
    contractValue: project.contractValue ? Number(project.contractValue) : undefined,
    contractorOrg: project.contractorOrg,
    clientOrg: project.clientOrg,
    consultantOrg: project.consultantOrg ?? undefined,
    userParty,
    userRole: session.role,
    allowedTabs,
  };

  return (
    <div className="min-h-screen bg-surface-default text-fg-default">
      {/* Top Header Navigation matching exact brand design */}
      <ProjectHeaderNav
        projectId={projectId}
        projectName={project.name}
        projectCode={project.code}
        userName={session.name}
        userRole={session.role}
      />

      {/* Main content container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
             
    </div>
  );
}