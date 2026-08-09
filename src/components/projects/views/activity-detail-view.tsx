"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { CommentThread, type CommentData } from "@/components/ui/comment-thread";
import { ActivityTimeline, type TimelineEvent } from "@/components/ui/activity-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { computeActivityStatus, type ActivityStatusInfo } from "@/lib/schedule-status";
import { ActivityCrewPanel } from "@/components/projects/views/activity-crew-panel";
import type { ActivityCrewPanelProps } from "@/components/projects/views/activity-crew-panel";
import {
  CalendarDays,
  User,
  HardHat,
  ClipboardList,
  ShieldCheck,
  GanttChartSquare,
  MessageSquare,
  History,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export type ActivityDetail = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  progressPercent: number;
  plannedStart: Date;
  plannedFinish: Date;
  baselineStart?: Date | null;
  baselineFinish?: Date | null;
  actualStart?: Date | null;
  actualFinish?: Date | null;
  wbsNode: {
    id: string;
    code: string;
    name: string;
    projectId: string;
    project: { name: string };
  };
  assignedEngineer?: { id: string; name: string } | null;
  assignedForeman?: { id: string; name: string } | null;
  totalDailyReports?: number;
  totalInspections?: number;
  inspectionTestRecords?: {
    id: string;
    result: string;
  }[];
};

export type ActivityDetailPageProps = {
  activity: ActivityDetail;
  projectId: string;
  comments: CommentData[];
  timeline: TimelineEvent[];
  onAddComment: (body: string, parentId?: string) => Promise<void>;
  crew?: Omit<ActivityCrewPanelProps, "projectId" | "activityId">;
  className?: string;
};

// ── Status Display ───────────────────────────────────────────────────

function getProgressVariant(progress: number): "emerald" | "terracotta" | "amber" {
  if (progress >= 100) return "emerald";
  if (progress >= 50) return "terracotta";
  return "amber";
}

function statusDisplay(computed: ActivityStatusInfo) {
  switch (computed.status) {
    case "OVERDUE": return { color: "text-red-500", label: "Overdue", badge: "bg-red-100 text-red-800" } as const;
    case "DUE_SOON": return { color: "text-amber-500", label: "Due Soon", badge: "bg-amber-100 text-amber-800" } as const;
    case "IN_PROGRESS": return { color: "text-blue-500", label: "In Progress", badge: "bg-blue-100 text-blue-800" } as const;
    case "NOT_STARTED": return { color: "text-fg-muted", label: "Not Started", badge: "bg-surface-raised text-fg-muted" } as const;
    case "COMPLETE": return { color: "text-emerald-500", label: "Complete", badge: "bg-emerald-100 text-emerald-800" } as const;
    case "ON_HOLD": return { color: "text-orange-500", label: "On Hold", badge: "bg-orange-100 text-orange-800" } as const;
    default: return { color: "text-fg-muted", label: "On Track", badge: "bg-surface-raised text-fg-muted" } as const;
  }
}

// ── Quality Status ──────────────────────────────────────────────────

type QualityStatus = "PASSED" | "FAILED" | "NOT_INSPECTED";

function computeQualityStatus(itrs?: { result: string }[]): QualityStatus {
  if (!itrs || itrs.length === 0) return "NOT_INSPECTED";
  if (itrs.some((itr) => itr.result === "FAIL")) return "FAILED";
  return "PASSED";
}

const QUALITY_DISPLAY: Record<
  QualityStatus,
  { color: string; badge: string; icon: any }
> = {
  PASSED: {
    color: "text-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    icon: ShieldCheck,
  },
  FAILED: {
    color: "text-red-500",
    badge: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
  NOT_INSPECTED: {
    color: "text-fg-muted",
    badge: "bg-surface-raised text-fg-muted",
    icon: ShieldCheck,
  },
};

// ── Section Header ───────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-semibold text-fg-default">{title}</h4>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function ActivityDetailPage({
  activity,
  projectId,
  comments,
  timeline,
  onAddComment,
  crew,
  className,
}: ActivityDetailPageProps) {
  const computed = useMemo(
    () =>
      computeActivityStatus({
        plannedStart: activity.plannedStart,
        plannedFinish: activity.plannedFinish,
        actualStart: activity.actualStart,
        actualFinish: activity.actualFinish,
        progressPercent: activity.progressPercent ?? 0,
        status: activity.status,
      }),
    [activity]
  );

  const display = statusDisplay(computed);
  const activeTab = "overview";

  const qualityStatus = computeQualityStatus(activity.inspectionTestRecords);
  const qualityDisplay = QUALITY_DISPLAY[qualityStatus];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Navigation + Title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="mb-1 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg-default"
          >
            <ArrowLeft className="h-3 w-3" />
            {activity.wbsNode.project.name}
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-fg-default">{activity.name}</h2>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", display.badge)}>
              {display.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {activity.wbsNode.code} — {activity.wbsNode.name}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Progress"
          value={`${activity.progressPercent ?? 0}%`}
          color={getProgressVariant(activity.progressPercent ?? 0)}
        />
        <MetricCard
          label="Site Engineer"
          value={activity.assignedEngineer?.name ?? "—"}
          color="slate"
        />
        <MetricCard
          label="Foreman"
          value={activity.assignedForeman?.name ?? "—"}
          color="slate"
        />
        <MetricCard
          label="Daily Reports"
          value={String(activity.totalDailyReports ?? 0)}
          color="slate"
        />
      </div>

      {/* Detail Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Schedule Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-fg-muted">Planned Start</p>
                <p className="font-medium text-fg-default">{formatDate(activity.plannedStart)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Planned Finish</p>
                <p className="font-medium text-fg-default">{formatDate(activity.plannedFinish)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Baseline Start</p>
                <p className="font-medium text-fg-default">
                  {activity.baselineStart ? formatDate(activity.baselineStart) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-fg-muted">Baseline Finish</p>
                <p className="font-medium text-fg-default">
                  {activity.baselineFinish ? formatDate(activity.baselineFinish) : "—"}
                </p>
              </div>
            </div>
            {computed.isOverdue && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Overdue by {Math.abs(computed.daysUntilFinish)} day{Math.abs(computed.daysUntilFinish) !== 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-primary" />
              Crew assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {crew ? (
              <ActivityCrewPanel
                projectId={projectId}
                activityId={activity.id}
                assignments={crew.assignments}
                canManage={crew.canManage}
                canAssignSiteEngineer={crew.canAssignSiteEngineer}
                canAssignForeman={crew.canAssignForeman}
                mustStayInOwnOrg={crew.mustStayInOwnOrg}
                candidates={crew.candidates}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <HardHat className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted">Site Engineer</p>
                    <p className="font-medium text-fg-default">
                      {activity.assignedEngineer?.name ?? "Not assigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <HardHat className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted">Foreman</p>
                    <p className="font-medium text-fg-default">
                      {activity.assignedForeman?.name ?? "Not assigned"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm">
            <GanttChartSquare className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {activity.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg-default">{activity.description}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Daily Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg-muted">
                  {activity.totalDailyReports ?? 0} report{(activity.totalDailyReports ?? 0) !== 1 ? "s" : ""} submitted
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg-muted">
                  {activity.totalInspections ?? 0} inspection{(activity.totalInspections ?? 0) !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Quality Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    qualityDisplay.badge
                  )}
                >
                  {qualityStatus === "FAILED" && <AlertTriangle className="h-3.5 w-3.5" />}
                  {qualityStatus}
                </span>
                {qualityStatus === "FAILED" && (
                  <p className="mt-1.5 text-xs text-red-600">
                    Some ITRs have failed inspections
                  </p>
                )}
                {qualityStatus === "PASSED" && (
                  <p className="mt-1.5 text-xs text-emerald-600">
                    All ITRs passed inspection
                  </p>
                )}
                {qualityStatus === "NOT_INSPECTED" && (
                  <p className="mt-1.5 text-xs text-fg-muted">
                    No inspection records found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <CommentThread
            comments={comments}
            entityType="activity"
            entityId={activity.id}
            projectId={activity.wbsNode.projectId}
            onSubmit={onAddComment}
            showHeader={false}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────

export function ActivityDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

// ── Actions Panel ────────────────────────────────────────────────────

export function ActivityActions({
  projectId,
  activityId,
  onScheduleChange,
}: {
  projectId: string;
  activityId: string;
  onScheduleChange?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/projects/${projectId}/daily?activityId=${activityId}`}>
        <Button variant="outline" size="sm">
          <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
          Add Daily Report
        </Button>
      </Link>
      <Link href={`/projects/${projectId}/quality?activityId=${activityId}`}>
        <Button variant="outline" size="sm">
          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
          Request Inspection
        </Button>
      </Link>
      {onScheduleChange && (
        <Button variant="outline" size="sm" onClick={onScheduleChange}>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          Request Schedule Change
        </Button>
      )}
    </div>
  );
}