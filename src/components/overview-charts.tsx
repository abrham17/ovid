"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#047857", "#0ea5e9", "#f59e0b", "#ef4444", "#64748b", "#8b5cf6"];

export function OverviewCharts({
  activityStats,
  safetyStats,
  budget,
  actual,
}: {
  activityStats: { status: string; count: number }[];
  safetyStats: { status: string; count: number }[];
  budget: number;
  actual: number;
}) {
  const costData = [
    { name: "Budget", value: budget },
    { name: "Actual", value: actual },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="h-40">
        <p className="mb-1 text-xs font-medium text-slate-500">Activities</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={activityStats} dataKey="count" nameKey="status" outerRadius={55} label={false}>
              {activityStats.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="h-40">
        <p className="mb-1 text-xs font-medium text-slate-500">Safety</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={safetyStats} dataKey="count" nameKey="status" outerRadius={55}>
              {safetyStats.map((_, i) => (
                <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="h-40 sm:col-span-2">
        <p className="mb-1 text-xs font-medium text-slate-500">Budget vs actual</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#047857" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
