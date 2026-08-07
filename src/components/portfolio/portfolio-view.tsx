"use client";

import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import {
  FolderKanban,
  AlertTriangle,
  ShieldAlert,
  ClipboardList,
  GitBranch,
  Clock,
} from "lucide-react";

type MetricKey = string;

type PortfolioProject = {
  id: string;
  code: string;
  name: string;
  status: string;
  projectType: string;
  contractValue: number;
  plannedStartDate: string | Date;
  plannedEndDate: string | Date;
  openRisks: number;
  openIncidents: number;
  pendingMeasurements: number;
};

type Props = {
  metrics: Partial<Record<MetricKey, number>>;
  portfolio: PortfolioProject[];
  organizationName: string;
};

export function PortfolioView({ metrics, portfolio, organizationName }: Props) {
  const cards = [
    { key: "activeProjects", label: "Active projects", icon: <FolderKanban className="h-5 w-5" />, color: "emerald" as const },
    { key: "openIncidents", label: "Open safety incidents", icon: <ShieldAlert className="h-5 w-5" />, color: "red" as const },
    { key: "openRisks", label: "Open risks", icon: <AlertTriangle className="h-5 w-5" />, color: "amber" as const },
    { key: "pendingMeasurements", label: "Pending IPC lines", icon: <ClipboardList className="h-5 w-5" />, color: "indigo" as const },
    { key: "pendingVariations", label: "Open variations", icon: <GitBranch className="h-5 w-5" />, color: "indigo" as const },
    { key: "recentStoppages", label: "Stoppages (14d)", icon: <Clock className="h-5 w-5" />, color: "slate" as const },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Portfolio"
        description={`Cross-project health for ${organizationName} — Ovid Construction PMS`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <MetricCard
            key={c.key}
            label={c.label}
            value={metrics[c.key] ?? 0}
            icon={c.icon}
            color={c.color}
          />
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-fg-default">Projects</h2>
        {portfolio.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects in portfolio"
            description="Join or create projects to see cross-project metrics."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {portfolio.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{p.code}</span>
                      <StatusBadge status={p.status} />
                      <StatusBadge status={p.projectType} />
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-fg-default">{p.name}</h3>
                    <p className="mt-1 text-xs text-fg-muted">
                      {formatDate(p.plannedStartDate)} → {formatDate(p.plannedEndDate)} ·{" "}
                      <span className="font-mono font-bold text-fg-default">{formatMoney(p.contractValue)}</span>
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-center text-xs">
                      <div>
                        <p className="font-bold text-warning">{p.openRisks}</p>
                        <p className="text-fg-muted">Risks</p>
                      </div>
                      <div>
                        <p className="font-bold text-danger">{p.openIncidents}</p>
                        <p className="text-fg-muted">Incidents</p>
                      </div>
                      <div>
                        <p className="font-bold text-info">{p.pendingMeasurements}</p>
                        <p className="text-fg-muted">Pending IPC</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(metrics.designPending ?? 0) > 0 && (
        <Card className="border-warning/40 bg-warning-subtle/60">
          <CardContent className="p-4 text-sm text-warning">
            <span className="font-semibold">{metrics.designPending}</span> WBS node(s) across the portfolio are still marked design-pending.
          </CardContent>
        </Card>
      )}
    </div>
  );
}