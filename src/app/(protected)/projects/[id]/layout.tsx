import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { getProjectWorkspaceHeader } from "@/lib/services/project.service";
import { ProjectSidebarNav } from "@/components/projects/project-sidebar-nav";
import { ProjectTopBar } from "@/components/projects/project-top-bar";

/**
 * Project workspace shell layout.
 * Fetches the project header once and renders the two-pane layout:
 *
 *   [ProjectSidebarNav] | [ProjectTopBar + children]
 *
 * Each [tab]/page.tsx only needs to render module content.
 * The active tab is communicated via the URL — NavLinks use aria-current
 * which the CSS uses for active styling.
 */
export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await getProjectWorkspaceHeader(user, id);
  if (!project) redirect("/dashboard");

  return (
    <div className="ws-layout flex-1">
      {/* Inner left sidebar — module navigation */}
      <ProjectSidebarNav project={project} activeTab="" />

      {/* Right content pane */}
      <div className="ws-content flex flex-col min-h-screen">
        <ProjectTopBar project={project} />
        <div className="flex-1 p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}
