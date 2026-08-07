"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { titleCase } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FileCheck, Plus, Loader2, Download } from "lucide-react";

type Props = {
  projectId: string;
  reports: any[];
  decisions: any[];
  lessons: any[];
  canUpdate: boolean;
};

export function ComplianceView({
  projectId,
  reports,
  decisions,
  lessons,
  canUpdate,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("reports");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [showLesson, setShowLesson] = useState(false);

  const [decisionType, setDecisionType] = useState("OTHER");
  const [decision, setDecision] = useState("");
  const [rationale, setRationale] = useState("");
  const [category, setCategory] = useState("Schedule");
  const [lesson, setLesson] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [exportResult, setExportResult] = useState<string | null>(null);

  async function post(body: object) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed");
        return null;
      }
      router.refresh();
      return json.data;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Compliance & decisions</h2>
          <p className="text-sm text-slate-500">
            MoUDC-style exports, decision log, and lessons learned
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={async () => {
                  const data = await post({ kind: "export_progress" });
                  if (data?.filePath) {
                    setExportResult(data.filePath);
                    setTab("reports");
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Export progress snapshot
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDecision(true)}>
                <Plus className="h-4 w-4" /> Decision
              </Button>
              <Button size="sm" onClick={() => setShowLesson(true)}>
                <Plus className="h-4 w-4" /> Lesson
              </Button>
            </>
          )}
        </div>
      </div>

      {exportResult && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-3 text-sm text-emerald-900">
            Progress snapshot registered at <code className="font-mono">{exportResult}</code>
          </CardContent>
        </Card>
      )}

      {showDecision && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="font-semibold">Record decision</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "decision",
                  data: { decisionType, decision, rationale: rationale || null },
                });
                if (ok) {
                  setShowDecision(false);
                  setDecision("");
                  setRationale("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                >
                  {[
                    "DESIGN_CHANGE",
                    "DELAY_RULING",
                    "VARIATION_APPROVAL",
                    "RESOURCE_ALLOCATION",
                    "SAFETY_STOPPAGE",
                    "OTHER",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Decision</Label>
                <Textarea value={decision} onChange={(e) => setDecision(e.target.value)} required rows={2} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Rationale</Label>
                <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDecision(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showLesson && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="font-semibold">Lesson learned</h3>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await post({
                  kind: "lesson",
                  data: {
                    category,
                    lesson,
                    recommendation: recommendation || null,
                  },
                });
                if (ok) {
                  setShowLesson(false);
                  setLesson("");
                  setRecommendation("");
                }
              }}
            >
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} required />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Lesson</Label>
                <Textarea value={lesson} onChange={(e) => setLesson(e.target.value)} required rows={2} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Recommendation</Label>
                <Textarea
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  rows={2}
                />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowLesson(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="decisions">Decisions ({decisions.length})</TabsTrigger>
          <TabsTrigger value="lessons">Lessons ({lessons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-2">
          {reports.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No regulatory reports"
              description="Generate a progress snapshot or register grading / safety compliance exports."
            />
          ) : (
            reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.reportType} />
                    <code className="font-mono text-xs text-slate-600">{r.filePath}</code>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(r.generatedAt)}
                  </span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="decisions" className="mt-4 space-y-2">
          {decisions.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No decisions logged"
              description="Record delay rulings, variation approvals, and safety stoppages."
            />
          ) : (
            decisions.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={d.decisionType} />
                    <span className="text-xs text-slate-400">
                      {formatDate(d.decidedAt)} · {d.madeBy?.fullName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{d.decision}</p>
                  {d.rationale && (
                    <p className="mt-1 text-xs text-slate-600">{d.rationale}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="lessons" className="mt-4 space-y-2">
          {lessons.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No lessons yet"
              description="Capture what worked and what to change on the next package."
            />
          ) : (
            lessons.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={l.category} />
                    <span className="text-xs text-slate-400">
                      {formatDate(l.recordedAt)} · {l.recordedBy?.fullName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{l.lesson}</p>
                  {l.recommendation && (
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Recommendation: </span>
                      {l.recommendation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
