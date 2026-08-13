import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Layers, CheckCircle2, Clock3 } from "lucide-react";

export function ProgressHealthPanel({ health, label }: { health: { overallProgress: number; qualityClearedProgress: number; overdue: number; dueSoon: number; complete: number; totalActivities: number }; label: string }) {
  return <Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Physical progress" value={`${health.overallProgress}%`} progress={health.overallProgress} color="emerald" icon={<Layers className="h-5 w-5" />} /><MetricCard label="Quality-cleared" value={`${health.qualityClearedProgress}%`} progress={health.qualityClearedProgress} color="indigo" icon={<CheckCircle2 className="h-5 w-5" />} /><MetricCard label="Overdue activities" value={health.overdue} color="red" icon={<Clock3 className="h-5 w-5" />} /><MetricCard label="Completed activities" value={`${health.complete}/${health.totalActivities}`} color="slate" icon={<CheckCircle2 className="h-5 w-5" />} /></div></CardContent></Card>;
}
