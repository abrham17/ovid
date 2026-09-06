'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AlertTriangle, ShieldCheck, DollarSign, Activity } from 'lucide-react';

interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  contractValue: number;
  physicalProgress: number;
  certifiedProgress: number;
  activeStoppages: number;
  standingCostETB: number;
  openClaimsCount: number;
}

interface ExecutiveDashboardProps {
  projects: ProjectSummary[];
  totalStandingCost: number;
  pendingClaimsValue: number;
}

export function ExecutiveDashboard({
  projects,
  totalStandingCost,
  pendingClaimsValue,
}: ExecutiveDashboardProps) {
  const chartData = projects.map((p) => ({
    name: p.code,
    'Uncertified Field Progress %': p.physicalProgress,
    'Certified IPC Progress %': p.certifiedProgress,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Top Management Executive Portfolio Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            ISO 9001 / ISO 10006 Centrally Governed Cross-Project Analytics
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-600" />
          General Manager Governance Scope
        </Badge>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Projects</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monitored across all divisions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Standing Cost</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ETB {totalStandingCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Accumulated work stoppage cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending FIDIC Claims</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ETB {pendingClaimsValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clause 8.4 & 20.1 Extension of Time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certified Progress Avg</CardTitle>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {(
                projects.reduce((acc, p) => acc + p.certifiedProgress, 0) /
                (projects.length || 1)
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quantity-based certified roll-up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* S-Curve / Physical vs Certified Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Physical Field Progress vs. Certified IPC Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Uncertified Field Progress %" fill="#3b82f6" />
              <Bar dataKey="Certified IPC Progress %" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Project Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects Status & Financial Standing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Code / Project</th>
                  <th className="px-4 py-3">Contract Value</th>
                  <th className="px-4 py-3">Field Progress</th>
                  <th className="px-4 py-3">Certified IPC</th>
                  <th className="px-4 py-3">Active Stoppages</th>
                  <th className="px-4 py-3">Standing Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div>{p.code}</div>
                      <div className="text-xs text-muted-foreground">{p.name}</div>
                    </td>
                    <td className="px-4 py-3">ETB {p.contractValue.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {p.physicalProgress}%
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {p.certifiedProgress}%
                    </td>
                    <td className="px-4 py-3">
                      {p.activeStoppages > 0 ? (
                        <Badge variant="destructive">{p.activeStoppages} Active</Badge>
                      ) : (
                        <Badge variant="outline">0</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      ETB {p.standingCostETB.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
