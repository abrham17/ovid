"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import type { CompanyDashboardPayload, CompanyRole } from "@/lib/types/company";

export function CompanyDashboard({ organizationName, roles }: { organizationName: string; roles: CompanyRole[] }) {
  const [data, setData] = useState<CompanyDashboardPayload>();
  useEffect(() => { fetch("/api/company/dashboard").then((r) => r.json()).then((r) => setData(r.data)); }, []);
  if (!data) return <div className="p-6">Loading company workspace…</div>;
  const metrics = data.metrics;
  const responsibility: Record<string, string> = {
    GENERAL_MANAGER: "Portfolio deadlines, budgets, deviations, compliance, and executive approvals",
    LEGAL_SERVICE_MANAGER: "Tender legal review, controlled templates, contracts, variations, and disputes",
    HEAD_TENDERING: "Tender lifecycle, project conversion, contractor onboarding, and contract performance",
    TENDERING_OFFICER: "Bid preparation, submission records, and tender follow-up",
    HEAD_PLANNING_MONITORING: "Cross-project schedule, EVM, critical path, and resource conflicts",
    PLANNING_OFFICER: "Schedule consolidation, variance analysis, and monitoring support",
    ENGINEERING_DEPT_MANAGER: "Major engineering, equipment, tender, budget, and contract escalation",
    HEAD_ENGINEERING_SERVICES: "Design quality, standards compliance, templates, and design-stage safety",
    ENGINEERING_SERVICES_OFFICER: "Design-quality audits and engineering consistency review",
    EQUIPMENT_ADMIN_MANAGER: "Central fleet, utilization, downtime, allocation, and capital requests",
    FINANCE_DEPT_MANAGER: "Portfolio cash flow, certified IPCs, treasury approval, and audit coordination",
    INTERNAL_AUDITOR: "Read-only audit, sign-off, risk, procurement, contract, and financial evidence",
  };
  return <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
    <PageHeader title="Company Control Centre" description={`${organizationName} · ${roles.map((r) => r.replaceAll("_", " ")).join(", ")}`} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Active projects" value={metrics.activeProjects} color="emerald" />
      <MetricCard label="Open risks" value={metrics.openRisks} color="amber" />
      <MetricCard label="Safety incidents" value={metrics.openIncidents} color="red" />
      <MetricCard label="Pending approvals" value={metrics.pendingApprovals} color="indigo" />
      <MetricCard label="Overdue activities" value={metrics.overdueActivities} color="amber" />
      <MetricCard label="Open variations" value={metrics.pendingVariations} color="indigo" />
      <MetricCard label="Audit events" value={metrics.auditEvents} color="slate" />
      <MetricCard label="Regulatory reports" value={metrics.regulatoryReports} color="slate" />
      <MetricCard label="Open tenders" value={metrics.openTenders} color="indigo" />
      <MetricCard label="Certified IPCs" value={metrics.certifiedIpcs} color="emerald" />
      <MetricCard label="Open defects" value={metrics.openDefects} color="red" />
      <MetricCard label="Resource conflicts" value={metrics.resourceConflicts} color="amber" />
      <MetricCard label="Portfolio SPI" value={metrics.portfolioSpi ?? "—"} color={metrics.portfolioSpi !== null && metrics.portfolioSpi < 1 ? "red" : "emerald"} />
      <MetricCard label="Portfolio CPI" value={metrics.portfolioCpi ?? "—"} color={metrics.portfolioCpi !== null && metrics.portfolioCpi < 1 ? "red" : "emerald"} />
      <MetricCard label="Critical activities" value={metrics.criticalActivities} color="red" />
      <MetricCard label="Certified unpaid" value={metrics.certifiedUnpaidValue.toLocaleString()} color="amber" />
      <MetricCard label="Open audit findings" value={metrics.openAuditFindings} color="red" />
      <MetricCard label="Overdue findings" value={metrics.overdueAuditFindings} color="red" />
      <MetricCard label="Equipment operating hours" value={metrics.equipmentOperatingHours} color="emerald" />
      <MetricCard label="Equipment down hours" value={metrics.equipmentDownHours} color="red" />
    </div>
    <div className="grid gap-4 md:grid-cols-4"><Link className="rounded-lg border bg-surface-raised p-4 font-semibold hover:border-primary" href="/company/tenders">Tender lifecycle</Link><Link className="rounded-lg border bg-surface-raised p-4 font-semibold hover:border-primary" href="/company/approvals">Governance approvals</Link><Link className="rounded-lg border bg-surface-raised p-4 font-semibold hover:border-primary" href="/company/governance">Engineering, legal & audit</Link><Link className="rounded-lg border bg-surface-raised p-4 font-semibold hover:border-primary" href="/portfolio">Portfolio monitoring</Link></div>
    <Card><CardHeader><CardTitle>Your company responsibilities</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{roles.map((role) => <div key={role} className="rounded border p-3"><b>{role.replaceAll("_", " ")}</b><p className="mt-1 text-xs">{responsibility[role]}</p></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Portfolio performance</CardTitle></CardHeader><CardContent className="space-y-2">{data.projects.map((p) => <Link className="block rounded border p-3 hover:border-primary" key={p.id} href={`/projects/${p.id}`}><div><b>{p.code}</b> · {p.name} <span className="float-right text-xs">{p.status}</span></div><div className="mt-2 grid gap-2 text-xs sm:grid-cols-4 lg:grid-cols-8"><span>Planned {p.plannedProgress}%</span><span>Actual {p.actualProgress}%</span><span className={p.scheduleVariance < 0 ? "text-red-600" : "text-emerald-700"}>Schedule {p.scheduleVariance > 0 ? "+" : ""}{p.scheduleVariance}%</span><span>Baseline drift {p.baselineVarianceDays} days</span><span>SPI {p.spi ?? "—"}</span><span>CPI {p.cpi ?? "—"}</span><span>EV {Math.round(p.earnedValue).toLocaleString()}</span><span>Critical {p.criticalActivities}</span></div></Link>)}</CardContent></Card>
  </div>;
}
