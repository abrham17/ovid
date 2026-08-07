import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  ClipboardList,
  Download,
  FileBarChart2,
  FileText,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { WORKSPACE_TAB_LABELS, formatCurrency, formatDate, titleCase } from "@/lib/constants";
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

type WorkspaceModuleData =
  | { tab: "daily"; data: DailyData }
  | { tab: "cost"; data: CostData }
  | { tab: "risk"; data: RiskData }
  | { tab: "safety"; data: SafetyData }
  | { tab: "quality"; data: QualityData }
  | { tab: "resources"; data: ResourcesData }
  | { tab: "engineering"; data: EngineeringData }
  | { tab: "documents"; data: DocumentsData }
  | { tab: "procurement"; data: ProcurementData }
  | { tab: "reports"; data: ReportsData };

type DailyData = {
  scopeBanner?: string;
  stats: { total: number; pending: number; rebarKg: number };
  entries: Array<{ id: string; type: string; title: string; date: Date; wbs: string; createdBy: string; metric?: string; status: string }>;
};

type CostData = {
  canViewCostDetail: boolean;
  stats: { boqCount: number; measurementCount: number; certifiedCount: number; variationCount: number };
  measurements: Array<{ id: string; itemNo: string; wbs: string; quantity: number; unitRate: number | null; status: string }>;
  variations: Array<{ id: string; description: string; wbs: string; timeImpactDays: number; costImpact: number | null; status: string }>;
};

type RiskData = {
  stats: { open: number; mitigating: number; realized: number };
  risks: Array<{ id: string; description: string; category: string; score: number; owner: string; wbs: string; status: string }>;
};

type SafetyData = {
  stats: { observations: number; openIncidents: number; critical: number };
  observations: Array<{ id: string; hazard: string; observedAt: Date; wbs: string; observedBy: string; severity: string }>;
  incidents: Array<{ id: string; description: string; type: string; wbs: string; activity?: string; status: string }>;
};

type QualityData = {
  stats: { inspections: number; openDefects: number; openPunch: number };
  itrs: Array<{ id: string; type: string; inspectedAt: Date; wbs: string; inspectedBy: string; result: string }>;
  defects: Array<{ id: string; description: string; wbs: string; responsible: string; delay?: number; status: string }>;
  patterns: Array<{ tag: string; count: number }>;
};

type ResourcesData = {
  stats: { demandCount: number; employees: number; utilizationPct: number; openCustody: number };
  demands: Array<{ id: string; material: string; wbs: string; delivered: number; needed: number; unit: string; neededBy: Date }>;
  assignments: Array<{ id: string; employee: string; date: Date; hours: number; wbs: string }>;
  equipmentLogs: Array<{ id: string; equipment: string; date: Date; operating: number; idle: number; down: number }>;
  custody: Array<{ id: string; item: string; from: string; to: string; transferredBy: string; transferredAt: Date; receivedBy?: string }>;
};

type EngineeringData = {
  stats: { elements: number; rebarKg: number; formworkM2: number };
  elements: Array<{ id: string; type: string; axis: string; floor?: string; wbs: string; rebarKg: number; formworkM2: number; checkpoints: number }>;
};

type DocumentsData = {
  stats: { documents: number; underReview: number; decisions: number; lessons: number };
  documents: Array<{ id: string; docNo: string; revision: string; title: string; category: string; wbs: string; issuedBy: string; status: string; filePath?: string }>;
  decisions: Array<{ id: string; decision: string; type: string; madeBy: string; decidedAt: Date }>;
  lessons: Array<{ id: string; lesson: string; category: string; recordedBy: string; recordedAt: Date }>;
};

type ProcurementData = {
  stats: { orders: number; openOrders: number; receipts: number; bids: number };
  orders: Array<{ id: string; poNo: string; supplier: string; itemCount: number; amount: number | null; expectedDelivery: Date; status: string }>;
  receipts: Array<{ id: string; poNo: string; material: string; quantity: number; receivedBy: string; receiptDate: Date }>;
  bids: Array<{ id: string; bidNo: string; title: string; supplier: string; amount: number | null; submittedBy: string; result: string }>;
};

type ReportsData = {
  stats: { total: number; progress: number; safety: number; grading: number };
  permissions: { canGenerate: boolean; canGenerateGrading: boolean };
  reports: Array<{ id: string; type: string; generatedAt: Date; filePath: string }>;
};

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "amber" | "red" | "sky";
}) {
  const colors = {
    slate: "bg-surface-sunken text-fg-muted",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div>
          <p className="font-mono text-2xl font-bold text-fg-default">{value}</p>
          <p className="text-xs font-medium text-fg-muted">{label}</p>
        </div>
        <span className={`h-9 w-9 rounded-lg ${colors[tone]}`} />
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border-subtle pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-fg-subtle">{label}</p>;
}

function Row({
  title,
  meta,
  status,
  aside,
}: {
  title: string;
  meta: string;
  status?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg-default">{title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {aside}
        {status ? <StatusBadge status={status} /> : null}
      </div>
    </div>
  );
}

function Header({ project, module }: { project: ProjectHeaderData; module: WorkspaceModuleData }) {
  const icons: Record<string, React.ReactNode> = {
    daily: <ClipboardList className="h-5 w-5" />,
    cost: <Banknote className="h-5 w-5" />,
    risk: <AlertTriangle className="h-5 w-5" />,
    safety: <ShieldCheck className="h-5 w-5" />,
    quality: <BadgeCheck className="h-5 w-5" />,
    resources: <Users className="h-5 w-5" />,
    engineering: <Ruler className="h-5 w-5" />,
    documents: <FileText className="h-5 w-5" />,
    procurement: <ShoppingCart className="h-5 w-5" />,
    reports: <FileBarChart2 className="h-5 w-5" />,
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-raised p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary-subtle p-2 text-primary">{icons[module.tab]}</div>
        <div>
          <h1 className="text-xl font-bold text-fg-default">{WORKSPACE_TAB_LABELS[module.tab]}</h1>
          <p className="text-xs text-fg-muted">{project.code} / {project.name}</p>
        </div>
      </div>
      <Badge variant="outline">{titleCase(project.userParty.partyType)}</Badge>
    </div>
  );
}

export function WorkspaceModuleView({
  project,
  module,
}: {
  project: ProjectHeaderData;
  module: WorkspaceModuleData;
}) {
  return (
    <div className="space-y-6">
      <Header project={project} module={module} />
      {module.tab === "daily" && <Daily data={module.data} />}
      {module.tab === "cost" && <Cost data={module.data} />}
      {module.tab === "risk" && <Risk data={module.data} />}
      {module.tab === "safety" && <Safety data={module.data} />}
      {module.tab === "quality" && <Quality data={module.data} />}
      {module.tab === "resources" && <Resources data={module.data} />}
      {module.tab === "engineering" && <Engineering data={module.data} />}
      {module.tab === "documents" && <Documents data={module.data} />}
      {module.tab === "procurement" && <Procurement data={module.data} />}
      {module.tab === "reports" && <Reports data={module.data} />}
    </div>
  );
}

function Daily({ data }: { data: Extract<WorkspaceModuleData, { tab: "daily" }>["data"] }) {
  return (
    <>
      {data.scopeBanner ? <p className="rounded-lg border border-border-default bg-surface-sunken px-4 py-2 text-xs text-fg-muted">{data.scopeBanner}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Recent entries" value={data.stats.total} />
        <Metric label="Pending sign-off" value={data.stats.pending} tone="amber" />
        <Metric label="Rebar recorded" value={`${data.stats.rebarKg.toFixed(1)} kg`} tone="emerald" />
      </div>
      <Section title="Daily report feed">
        {data.entries.length ? data.entries.map((e) => (
          <Row key={`${e.type}-${e.id}`} title={`${e.type}: ${e.title}`} meta={`${formatDate(e.date)} / ${e.wbs} / ${e.createdBy}${e.metric ? ` / ${e.metric}` : ""}`} status={e.status} />
        )) : <Empty label="No daily reports in scope yet." />}
      </Section>
    </>
  );
}

function Cost({ data }: { data: Extract<WorkspaceModuleData, { tab: "cost" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="BoQ items" value={data.stats.boqCount} />
        <Metric label="IPC measurements" value={data.stats.measurementCount} tone="sky" />
        <Metric label="Certified" value={data.stats.certifiedCount} tone="emerald" />
        <Metric label="Variations" value={data.stats.variationCount} tone="amber" />
      </div>
      {!data.canViewCostDetail ? <p className="rounded-lg border border-warning/40 bg-warning-subtle px-4 py-2 text-xs text-warning">Rates, actuals, and margin-sensitive values are redacted for this party.</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="IPC pipeline">
          {data.measurements.length ? data.measurements.map((m) => (
            <Row key={m.id} title={m.itemNo} meta={`${m.wbs} / Qty ${m.quantity}${m.unitRate === null ? "" : ` / Rate ${formatCurrency(m.unitRate)}`}`} status={m.status} />
          )) : <Empty label="No measurements recorded." />}
        </Section>
        <Section title="Variation orders">
          {data.variations.length ? data.variations.map((v) => (
            <Row key={v.id} title={v.description} meta={`${v.wbs} / ${v.timeImpactDays} days${v.costImpact === null ? "" : ` / ${formatCurrency(v.costImpact)}`}`} status={v.status} />
          )) : <Empty label="No variations recorded." />}
        </Section>
      </div>
    </>
  );
}

function Risk({ data }: { data: Extract<WorkspaceModuleData, { tab: "risk" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Open" value={data.stats.open} tone="amber" />
        <Metric label="Mitigating" value={data.stats.mitigating} tone="sky" />
        <Metric label="Realized" value={data.stats.realized} tone="red" />
      </div>
      <Section title="Risk register">
        {data.risks.length ? data.risks.map((r) => (
          <Row key={r.id} title={r.description} meta={`${titleCase(r.category)} / score ${r.score} / ${r.owner} / ${r.wbs}`} status={r.status} />
        )) : <Empty label="No risks in this workspace." />}
      </Section>
    </>
  );
}

function Safety({ data }: { data: Extract<WorkspaceModuleData, { tab: "safety" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Observations" value={data.stats.observations} />
        <Metric label="Open incidents" value={data.stats.openIncidents} tone="red" />
        <Metric label="Critical hazards" value={data.stats.critical} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Observation feed">
          {data.observations.length ? data.observations.map((o) => (
            <Row key={o.id} title={o.hazard} meta={`${formatDate(o.observedAt)} / ${o.wbs} / ${o.observedBy}`} status={o.severity} />
          )) : <Empty label="No safety observations logged." />}
        </Section>
        <Section title="Incident register">
          {data.incidents.length ? data.incidents.map((i) => (
            <Row key={i.id} title={i.description} meta={`${titleCase(i.type)} / ${i.wbs}${i.activity ? ` / ${i.activity}` : ""}`} status={i.status} />
          )) : <Empty label="No safety incidents in scope." />}
        </Section>
      </div>
    </>
  );
}

function Quality({ data }: { data: Extract<WorkspaceModuleData, { tab: "quality" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Inspections" value={data.stats.inspections} />
        <Metric label="Open defects" value={data.stats.openDefects} tone="red" />
        <Metric label="Open punch items" value={data.stats.openPunch} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="ITR log">
          {data.itrs.length ? data.itrs.map((i) => (
            <Row key={i.id} title={i.type} meta={`${formatDate(i.inspectedAt)} / ${i.wbs} / ${i.inspectedBy}`} status={i.result} />
          )) : <Empty label="No inspections recorded." />}
        </Section>
        <Section title="Defects and punch patterns">
          {data.defects.map((d) => (
            <Row key={d.id} title={d.description} meta={`${d.wbs} / ${d.responsible}${d.delay ? ` / ${d.delay} days` : ""}`} status={d.status} />
          ))}
          {data.defects.length === 0 ? <Empty label="No defects recorded." /> : null}
          {data.patterns.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.patterns.map((p) => <Badge key={p.tag} variant="info">{p.tag}: {p.count}</Badge>)}
            </div>
          ) : null}
        </Section>
      </div>
    </>
  );
}

function Resources({ data }: { data: Extract<WorkspaceModuleData, { tab: "resources" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Material demands" value={data.stats.demandCount} />
        <Metric label="Employees" value={data.stats.employees} tone="sky" />
        <Metric label="Equipment utilization" value={`${data.stats.utilizationPct}%`} tone="emerald" />
        <Metric label="Open custody" value={data.stats.openCustody} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Material demand vs delivery">
          {data.demands.length ? data.demands.map((d) => <Row key={d.id} title={d.material} meta={`${d.wbs} / ${d.delivered} of ${d.needed} ${d.unit} / needed ${formatDate(d.neededBy)}`} />) : <Empty label="No material demands." />}
        </Section>
        <Section title="Labor and equipment">
          {data.assignments.slice(0, 10).map((a) => <Row key={a.id} title={a.employee} meta={`${formatDate(a.date)} / ${a.hours}h / ${a.wbs}`} />)}
          {data.equipmentLogs.slice(0, 10).map((e) => <Row key={e.id} title={e.equipment} meta={`${formatDate(e.date)} / OH ${e.operating} / IH ${e.idle} / DH ${e.down}`} />)}
          {data.assignments.length === 0 && data.equipmentLogs.length === 0 ? <Empty label="No labor or equipment logs." /> : null}
        </Section>
      </div>
      <Section title="Custody log">
        {data.custody.length ? data.custody.map((c) => <Row key={c.id} title={c.item} meta={`${c.from} -> ${c.to} / ${c.transferredBy} / ${formatDate(c.transferredAt)}`} status={c.receivedBy ? "CLOSED" : "OPEN"} />) : <Empty label="No custody transfers." />}
      </Section>
    </>
  );
}

function Engineering({ data }: { data: Extract<WorkspaceModuleData, { tab: "engineering" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Elements" value={data.stats.elements} />
        <Metric label="Computed rebar" value={`${data.stats.rebarKg.toFixed(1)} kg`} tone="emerald" />
        <Metric label="Computed formwork" value={`${data.stats.formworkM2.toFixed(1)} m2`} tone="sky" />
      </div>
      <Section title="Structural element browser">
        {data.elements.length ? data.elements.map((e) => <Row key={e.id} title={`${titleCase(e.type)} / ${e.axis}`} meta={`${e.floor ?? "No floor"} / ${e.wbs} / ${e.rebarKg.toFixed(1)} kg / ${e.formworkM2.toFixed(1)} m2 / ${e.checkpoints} checkpoints`} />) : <Empty label="No structural elements." />}
      </Section>
    </>
  );
}

function Documents({ data }: { data: Extract<WorkspaceModuleData, { tab: "documents" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Documents" value={data.stats.documents} />
        <Metric label="Under review" value={data.stats.underReview} tone="amber" />
        <Metric label="Decisions" value={data.stats.decisions} tone="sky" />
        <Metric label="Lessons" value={data.stats.lessons} tone="emerald" />
      </div>
      <Section title="Controlled documents">
        {data.documents.length ? data.documents.map((d) => (
          <Row key={d.id} title={`${d.docNo} rev ${d.revision}: ${d.title}`} meta={`${titleCase(d.category)} / ${d.wbs} / issued by ${d.issuedBy}`} status={d.status} aside={d.filePath ? <Link href={d.filePath} className="text-primary"><Download className="h-4 w-4" /></Link> : null} />
        )) : <Empty label="No controlled documents." />}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Decision log">
          {data.decisions.length ? data.decisions.map((d) => <Row key={d.id} title={d.decision} meta={`${titleCase(d.type)} / ${d.madeBy} / ${formatDate(d.decidedAt)}`} />) : <Empty label="No decisions recorded." />}
        </Section>
        <Section title="Lessons learned">
          {data.lessons.length ? data.lessons.map((l) => <Row key={l.id} title={l.lesson} meta={`${l.category} / ${l.recordedBy} / ${formatDate(l.recordedAt)}`} />) : <Empty label="No lessons captured." />}
        </Section>
      </div>
    </>
  );
}

function Procurement({ data }: { data: Extract<WorkspaceModuleData, { tab: "procurement" }>["data"] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Purchase orders" value={data.stats.orders} />
        <Metric label="Open POs" value={data.stats.openOrders} tone="amber" />
        <Metric label="Receipts" value={data.stats.receipts} tone="emerald" />
        <Metric label="Bids" value={data.stats.bids} tone="sky" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Purchase orders">
          {data.orders.length ? data.orders.map((o) => <Row key={o.id} title={`${o.poNo} / ${o.supplier}`} meta={`${o.itemCount} items${o.amount === null ? "" : ` / ${formatCurrency(o.amount)}`} / due ${formatDate(o.expectedDelivery)}`} status={o.status} />) : <Empty label="No purchase orders." />}
        </Section>
        <Section title="Receipts and tenders">
          {data.receipts.map((r) => <Row key={r.id} title={`${r.poNo} / ${r.material}`} meta={`${r.quantity} received by ${r.receivedBy} / ${formatDate(r.receiptDate)}`} />)}
          {data.bids.map((b) => <Row key={b.id} title={`${b.bidNo} / ${b.title}`} meta={`${b.supplier}${b.amount === null ? "" : ` / ${formatCurrency(b.amount)}`} / ${b.submittedBy}`} status={b.result} />)}
          {data.receipts.length === 0 && data.bids.length === 0 ? <Empty label="No receipts or bids." /> : null}
        </Section>
      </div>
    </>
  );
}

function Reports({
  data,
}: {
  data: Extract<WorkspaceModuleData, { tab: "reports" }>["data"];
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Generated reports" value={data.stats.total} />
        <Metric label="Progress" value={data.stats.progress} tone="sky" />
        <Metric label="Safety" value={data.stats.safety} tone="emerald" />
        <Metric label="Grading" value={data.stats.grading} tone="amber" />
      </div>
      {data.permissions.canGenerate ? (
        <Section title="Generate report">
          <p className="text-xs text-fg-muted">Report generation is available for authorized roles.</p>
        </Section>
      ) : null}
      <Section title="Generated report files">
        {data.reports.length ? data.reports.map((r) => <Row key={r.id} title={titleCase(r.type)} meta={formatDate(r.generatedAt)} aside={<Link href={r.filePath} className="text-primary"><Download className="h-4 w-4" /></Link>} />) : <Empty label="No generated reports." />}
      </Section>
    </>
  );
}