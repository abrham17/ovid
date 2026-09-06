import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProject } from "@/lib/services/project.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { formatCurrency, titleCase } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { getScopeUiHints } from "@/lib/scope-ui";
import { ScopeBanner, ScopeEmptyState } from "@/components/projects/scope-notice";
import { can } from "@/lib/permissions";
import {
  Users,
  Network,
  ClipboardList,
  ShieldAlert,
  AlertTriangle,
  CalendarDays,
  Building2,
  DollarSign,
  Calendar,
} from "lucide-react";
import Link from "next/link";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectOverviewPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { projectId } = await params;
  const [project, hints] = await Promise.all([
    getProject(session, projectId),
    getScopeUiHints(session, projectId),
  ]);

  const canSeeContractValue = can(session.role, "cost", "read") || can(session.role, "contract", "read");
  const canSeeTeamMembers = can(session.role, "team", "read");

  const stats = [
    ...(canSeeTeamMembers
      ? [
          {
            label: "Team members",
            value: project._count.memberships,
            icon: <Users className="h-5 w-5" />,
            href: "team",
            color: "indigo" as const,
          },
        ]
      : []),
    {
      label: "WBS nodes",
      value: project._count.wbsNodes,
      icon: <Network className="h-5 w-5" />,
      href: "wbs",
      color: "emerald" as const,
    },
    {
      label: "Schedule activities",
      value: project._count.scheduleActivities,
      icon: <CalendarDays className="h-5 w-5" />,
      href: "schedule",
      color: "amber" as const,
    },
    {
      label: "Daily entries",
      value: project._count.earthworkDailyEntries,
      icon: <ClipboardList className="h-5 w-5" />,
      href: "daily",
      color: "slate" as const,
    },
    {
      label: "Defect logs",
      value: project._count.defectLogs,
      icon: <ShieldAlert className="h-5 w-5" />,
      href: "quality",
      color: "red" as const,
    },
    {
      label: "Safety incidents",
      value: project._count.safetyIncidents,
      icon: <AlertTriangle className="h-5 w-5" />,
      href: "safety",
      color: "red" as const,
    },
  ];

  const showEmpty =
    Boolean(hints.emptyTitle) &&
    project._count.wbsNodes === 0 &&
    project._count.scheduleActivities === 0;

  return (
    <div className="space-y-6">
      <ScopeBanner message={hints.banner} />
      {showEmpty ? (
        <ScopeEmptyState
          show
          title={hints.emptyTitle}
          description={hints.emptyDescription}
        />
      ) : null}
      {/* Project header card */}
      <Card className="overflow-hidden">
        <div className="h-1.5 from-terracotta-500 via-accent to-sand-300" />
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono font-bold text-xs tracking-wider">
                  {project.code}
                </Badge>
                <StatusBadge status={project.status} />
              </div>
              <CardTitle className="text-2xl font-extrabold">{project.name}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg p-3">
              <Building2 className="h-5 w-5 text-fg-subtle shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Type
                </p>
                <p className="text-sm font-medium text-fg-default">
                  {titleCase(project.projectType)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3">
              <DollarSign className="h-5 w-5 text-fg-subtle shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Contract value
                </p>
                <p className="text-sm font-medium text-fg-default">
                  {canSeeContractValue && project.contractValue != null
                    ? formatCurrency(Number(project.contractValue), "ETB")
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3">
              <Calendar className="h-5 w-5 text-fg-subtle shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Start
                </p>
                <p className="text-sm font-medium text-fg-default">
                  {formatDate(project.actualStartDate || project.plannedStartDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg p-3">
              <Building2 className="h-5 w-5 text-fg-subtle shrink-0" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Client
                </p>
                <p className="text-sm font-medium text-fg-default">
                  {project.clientOrg.name || "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={`/projects/${projectId}/${s.href}`}>
            <MetricCard
              label={s.label}
              value={s.value}
              icon={s.icon}
              color={s.color}
              className="cursor-pointer"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
