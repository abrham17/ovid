"use client";

type GanttActivity = {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  status: string;
};

type GanttStoppage = {
  id: string;
  start: string;
  end: string;
  reason: string;
};

export function ScheduleGantt({
  activities,
  stoppages = [],
}: {
  activities: GanttActivity[];
  stoppages?: GanttStoppage[];
}) {
  if (activities.length === 0) return null;

  const starts = activities.map((a) => new Date(a.start).getTime());
  const ends = activities.map((a) => new Date(a.end).getTime());
  const min = Math.min(...starts, ...stoppages.map((s) => new Date(s.start).getTime()));
  const max = Math.max(...ends, ...stoppages.map((s) => new Date(s.end).getTime()));
  const span = Math.max(1, max - min);

  const pct = (t: number) => ((t - min) / span) * 100;
  const width = (start: number, end: number) => Math.max(0.8, ((end - start) / span) * 100);

  return (
    <div className="space-y-2" role="img" aria-label="Schedule timeline">
      {activities.map((a) => {
        const s = new Date(a.start).getTime();
        const e = new Date(a.end).getTime();
        const left = pct(s);
        const w = width(s, e);
        return (
          <div key={a.id} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-2 text-xs">
            <span className="truncate font-medium text-slate-700" title={a.name}>
              {a.name}
            </span>
            <div className="relative h-7 rounded bg-slate-100">
              <div
                className={`absolute top-1 h-5 rounded ${
                  a.status === "ON_HOLD"
                    ? "bg-amber-400"
                    : a.status === "COMPLETE"
                      ? "bg-emerald-600"
                      : "bg-emerald-500"
                }`}
                style={{ left: `${left}%`, width: `${w}%` }}
                title={`${a.name}: ${a.progress}%`}
              >
                <div
                  className="h-full rounded bg-emerald-800/40"
                  style={{ width: `${Math.min(100, a.progress)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
      {stoppages.slice(0, 8).map((s) => {
        const start = new Date(s.start).getTime();
        const end = new Date(s.end).getTime();
        return (
          <div key={s.id} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-2 text-xs">
            <span className="truncate text-red-600" title={s.reason}>
              Stoppage
            </span>
            <div className="relative h-4 rounded bg-slate-50">
              <div
                className="absolute top-0.5 h-3 rounded bg-red-400/80"
                style={{ left: `${pct(start)}%`, width: `${width(start, end)}%` }}
                title={s.reason}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
