"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/constants";

export interface SCurvePoint {
  label: string;
  planned: number;
  earned: number;
  actual: number;
}

export function SCurveChart({ data }: { data: SCurvePoint[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No S-curve data yet.</p>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
            }
          />
          <Tooltip
            formatter={(value) => formatCurrency(Array.isArray(value) ? value[0] : typeof value === "number" ? value : Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="planned" name="Planned" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
          <Line type="monotone" dataKey="earned" name="Earned (certified)" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="actual" name="Actual cost" stroke="#dc2626" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
