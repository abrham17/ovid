"use client";

import { useState } from "react";
import {
  CalendarDays,
  Plus,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  List,
  BarChart2,
  Clock,
  Link as LinkIcon,
  Check,
  PauseCircle,
  FileSpreadsheet,
} from "lucide-react";
import type {
  ScheduleWorkspaceData,
  ScheduleActivityItem,
} from "@/lib/services/schedule.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ScheduleGantt } from "@/components/schedule-gantt";
import {
  createActivity,
  createDependency,
  createStoppage,
  updateActivityProgress,
  flagActivityBlocked,
  approveScheduleBaseline,
} from "@/lib/actions/schedule";
import { formatDate } from "@/lib/constants";

export function ScheduleView({ data }: { data: ScheduleWorkspaceData }) {
  const [activeTab, setActiveTab] = useState<"GANTT" | "TABLE" | "STOPPAGES">("GANTT");

  // Modal states
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [createDepOpen, setCreateDepOpen] = useState(false);
  const [createStoppageOpen, setCreateStoppageOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [baselineModalOpen, setBaselineModalOpen] = useState(false);

  const [selectedActivity, setSelectedActivity] = useState<ScheduleActivityItem | null>(null);

  const openProgressModal = (activity: ScheduleActivityItem) => {
    setSelectedActivity(activity);
    setProgressModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Stats ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{data.stats.avgProgress}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Overall Schedule Progress</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700">{data.stats.inProgressCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Activities In Progress</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{data.stats.blockedCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Blocked / On Hold</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <PauseCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{data.stats.totalStoppageEvents}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stoppages ({data.stats.totalStoppageHours}h)
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-700">{data.stats.completedCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Completed Activities</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar & View Controls ─────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("GANTT")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "GANTT"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Gantt Timeline
              </button>
              <button
                onClick={() => setActiveTab("TABLE")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "TABLE"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Activities Table ({data.stats.totalActivities})
              </button>
              <button
                onClick={() => setActiveTab("STOPPAGES")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "STOPPAGES"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Work Stoppages ({data.stats.totalStoppageEvents})
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {data.permissions.canApproveBaseline && (
                <Button
                  onClick={() => setBaselineModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100 gap-1 text-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve Baseline
                </Button>
              )}

              {data.permissions.canRecordStoppage && (
                <Button
                  onClick={() => setCreateStoppageOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100 gap-1 text-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Log Stoppage
                </Button>
              )}

              {data.permissions.canEditSchedule && (
                <>
                  <Button
                    onClick={() => setCreateDepOpen(true)}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Link Dependency
                  </Button>
                  <Button
                    onClick={() => setCreateActivityOpen(true)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Activity
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main View Content ────────────────────────────────────────── */}
      {activeTab === "GANTT" && (
        <Card>
          <CardContent className="pt-6 pb-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              Schedule Gantt Timeline
            </h3>

            {data.activities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No schedule activities found. Click "Add Activity" to create one.
              </div>
            ) : (
              <ScheduleGantt
                activities={data.activities.map((a) => ({
                  id: a.id,
                  name: `[${a.wbsCode}] ${a.name}`,
                  start: a.plannedStart,
                  end: a.plannedFinish,
                  progress: a.progressPercent,
                  status: a.status,
                }))}
                stoppages={data.stoppages.map((s) => ({
                  id: s.id,
                  start: s.startTime,
                  end: s.endTime,
                  reason: s.reason,
                }))}
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "TABLE" && (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Activity Name</th>
                    <th className="py-3 px-3">WBS Node</th>
                    <th className="py-3 px-3">Planned Schedule</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 w-[15%]">Progress</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.activities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No activities found.
                      </td>
                    </tr>
                  ) : (
                    data.activities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {act.name}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {act.wbsCode}
                          </Badge>{" "}
                          <span className="text-slate-500">{act.wbsName}</span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {formatDate(act.plannedStart)} – {formatDate(act.plannedFinish)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={act.status} className="text-[10px]" />
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-600 transition-all"
                                style={{ width: `${act.progressPercent}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-700 min-w-8">
                              {act.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {data.permissions.canEditSchedule && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openProgressModal(act)}
                                className="text-xs h-7 text-emerald-700 hover:bg-emerald-50"
                              >
                                Update Progress
                              </Button>
                            )}

                            {data.permissions.canFlagBlocked && act.status !== "ON_HOLD" && (
                              <ActionForm action={flagActivityBlocked} className="inline-block">
                                <input type="hidden" name="projectId" value={data.projectId} />
                                <input type="hidden" name="activityId" value={act.id} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-amber-700 hover:bg-amber-50"
                                >
                                  Flag Blocked
                                </Button>
                              </ActionForm>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "STOPPAGES" && (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Stoppage Type & Reason</th>
                    <th className="py-3 px-3">WBS / Activity</th>
                    <th className="py-3 px-3">Station Range</th>
                    <th className="py-3 px-3">Start & End Time</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.stoppages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No work stoppages recorded on this project.
                      </td>
                    </tr>
                  ) : (
                    data.stoppages.map((stop) => (
                      <tr key={stop.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            {stop.stoppageType}
                          </span>
                          <p className="mt-1 font-medium text-slate-900">{stop.reason}</p>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {stop.wbsCode ? `[${stop.wbsCode}] ` : ""}
                          {stop.activityName ?? "Entire Site"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">
                          {stop.stationFrom || stop.stationTo
                            ? `${stop.stationFrom ?? "0+000"} – ${stop.stationTo ?? "End"}`
                            : "N/A"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                          {formatDate(stop.startTime)} – {formatDate(stop.endTime)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-red-700">
                          {stop.durationHours}h
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modal: Create Activity ────────────────────────────────────── */}
      <ModalDialog
        isOpen={createActivityOpen}
        onClose={() => setCreateActivityOpen(false)}
        title="Add Schedule Activity"
        description="Create a new schedule task under a WBS node."
      >
        <ActionForm
          action={createActivity}
          onSuccess={() => setCreateActivityOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={data.projectId} />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WBS Node *
            </label>
            <select
              name="wbsNodeId"
              required
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select WBS Node</option>
              {data.wbsNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.code} — {n.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Activity Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Sub-grade Excavation"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Baseline Start *
              </label>
              <input
                type="date"
                name="baselineStart"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Baseline Finish *
              </label>
              <input
                type="date"
                name="baselineFinish"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planned Start *
              </label>
              <input
                type="date"
                name="plannedStart"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planned Finish *
              </label>
              <input
                type="date"
                name="plannedFinish"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateActivityOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Create Activity
            </SubmitButton>
          </div>
        </ActionForm>
      </ModalDialog>

      {/* ── Modal: Link Dependency ────────────────────────────────────── */}
      <ModalDialog
        isOpen={createDepOpen}
        onClose={() => setCreateDepOpen(false)}
        title="Link Schedule Dependency"
        description="Establish a dependency relationship between two activities."
      >
        <ActionForm
          action={createDependency}
          onSuccess={() => setCreateDepOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={data.projectId} />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Predecessor Activity (Prerequisite) *
            </label>
            <select
              name="predecessorId"
              required
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select Predecessor</option>
              {data.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.wbsCode}] {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Successor Activity (Dependent) *
            </label>
            <select
              name="successorId"
              required
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select Successor</option>
              {data.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.wbsCode}] {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dependency Type *
              </label>
              <select
                name="dependencyType"
                defaultValue="FS"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="FS">Finish-to-Start (FS)</option>
                <option value="SS">Start-to-Start (SS)</option>
                <option value="FF">Finish-to-Finish (FF)</option>
                <option value="SF">Start-to-Finish (SF)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lag Days
              </label>
              <input
                type="number"
                name="lagDays"
                defaultValue="0"
                min="0"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDepOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Create Dependency
            </SubmitButton>
          </div>
        </ActionForm>
      </ModalDialog>

      {/* ── Modal: Update Activity Progress ──────────────────────────── */}
      {selectedActivity && (
        <ModalDialog
          isOpen={progressModalOpen}
          onClose={() => setProgressModalOpen(false)}
          title={`Update Progress — ${selectedActivity.name}`}
          description="Update actual progress % and activity status."
        >
          <ActionForm
            action={updateActivityProgress}
            onSuccess={() => setProgressModalOpen(false)}
            className="space-y-4"
          >
            <input type="hidden" name="projectId" value={data.projectId} />
            <input type="hidden" name="activityId" value={selectedActivity.id} />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Progress Percentage (0 - 100%) *
              </label>
              <input
                type="number"
                name="progressPercent"
                defaultValue={selectedActivity.progressPercent}
                min="0"
                max="100"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Activity Status *
              </label>
              <select
                name="status"
                defaultValue={selectedActivity.status}
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETE">Complete</option>
                <option value="ON_HOLD">On Hold / Blocked</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProgressModalOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Save Progress
              </SubmitButton>
            </div>
          </ActionForm>
        </ModalDialog>
      )}

      {/* ── Modal: Log Work Stoppage ──────────────────────────────────── */}
      <ModalDialog
        isOpen={createStoppageOpen}
        onClose={() => setCreateStoppageOpen(false)}
        title="Log On-Site Work Stoppage Report"
        description="Digital Twin of IMS On-Site Work Stoppage Report for delay claims & FIDIC variations."
      >
        <ActionForm
          action={createStoppage}
          onSuccess={() => setCreateStoppageOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={data.projectId} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stoppage Type *
              </label>
              <select
                name="stoppageType"
                required
                defaultValue="WEATHER"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="WEATHER">Heavy Weather / Rain</option>
                <option value="DESIGN_CHANGE">Design Change / Instruction</option>
                <option value="MATERIAL_SHORTAGE">Material Shortage</option>
                <option value="CLIENT_INSTRUCTION">Client Instruction</option>
                <option value="EQUIPMENT_BREAKDOWN">Equipment Breakdown</option>
                <option value="LABOR_DISPUTE">Labor Dispute</option>
                <option value="FORCE_MAJEURE">Force Majeure</option>
                <option value="CONTRACTOR_DEFAULT">Contractor Default</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affected Activity
              </label>
              <select
                name="scheduleActivityId"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Entire Site / General</option>
                {data.activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.wbsCode}] {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason & Details *
            </label>
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="e.g. Unseasonable heavy rainfall halted all earthwork compaction at Station 12+500"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                name="startTime"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Station From (optional)
              </label>
              <input
                type="text"
                name="stationFrom"
                placeholder="e.g. 10+200"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Station To (optional)
              </label>
              <input
                type="text"
                name="stationTo"
                placeholder="e.g. 14+800"
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateStoppageOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              Log Stoppage Report
            </SubmitButton>
          </div>
        </ActionForm>
      </ModalDialog>

      {/* ── Modal: Approve Baseline ───────────────────────────────────── */}
      <ModalDialog
        isOpen={baselineModalOpen}
        onClose={() => setBaselineModalOpen(false)}
        title="Approve Schedule Baseline"
        description="Senior PM action to baseline all planned dates across the schedule."
      >
        <ActionForm
          action={approveScheduleBaseline}
          onSuccess={() => setBaselineModalOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="projectId" value={data.projectId} />

          <p className="text-xs text-slate-600">
            Approving the schedule baseline will lock current activity dates as the official baseline
            target. Any future deviations will reflect as schedule variance.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBaselineModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Approve Baseline Target
            </SubmitButton>
          </div>
        </ActionForm>
      </ModalDialog>
    </div>
  );
}
