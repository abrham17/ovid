import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProjects } from "@/lib/services/project.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, titleCase } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Plus, MapPin, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await listProjects(session);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length === 1 ? "" : "s"} in ${session.organizationName}`}
        actions={undefined}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking WBS, schedule, daily reports and more."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        {p.code}
                      </p>
                      <CardTitle className="mt-1 text-lg leading-snug">{p.name}</CardTitle>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-sunken px-2 py-0.5 text-xs font-medium text-fg-muted">
                      {titleCase(p.projectType)}
                    </span>
                    {p.contractType && (
                      <span className="text-xs text-fg-subtle">
                        {titleCase(p.contractType)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-fg-subtle" />
                      {p._count.memberships} members
                    </span>
                    <span className="font-mono font-bold text-fg-default">
                      {p.contractValue != null
                        ? formatCurrency(Number(p.contractValue), "ETB")
                        : "—"}
                    </span>
                  </div>
                  {p.actualStartDate && (
                    <p className="text-xs text-fg-subtle">
                      Started {formatDate(p.actualStartDate)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
