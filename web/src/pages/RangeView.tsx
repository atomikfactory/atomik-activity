import { useMemo, useState } from "react";
import { TimelineMap } from "../components/map/TimelineMap";
import { SummaryCards } from "../components/stats/SummaryCards";
import { DistancePerDayChart } from "../components/charts/DistancePerDayChart";
import { useRange } from "../hooks/useTracking";
import { addDaysIso, localDayOf, todayIso } from "../lib/time";
import { aggregateByDay, computeDayStats, NO_POINTS } from "../lib/stats";
import { Button } from "../components/ui/Button";

const presets: Array<{ label: string; days: number }> = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export function RangeView() {
  const [from, setFrom] = useState<string>(addDaysIso(todayIso(), -6));
  const [to, setTo] = useState<string>(todayIso());

  const range = useRange(from, to);
  const points = range.data?.points ?? NO_POINTS;

  const stats = useMemo(() => computeDayStats(points), [points]);
  const daily = useMemo(() => aggregateByDay(points), [points]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Range view</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {range.isLoading
              ? "Loading…"
              : `${stats.pointsCount} points across ${daily.length} day${
                  daily.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent px-2 py-1 text-sm focus:outline-none"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={todayIso()}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent px-2 py-1 text-sm focus:outline-none"
          />
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="ghost"
              onClick={() => {
                const newTo = todayIso();
                setTo(newTo);
                setFrom(addDaysIso(newTo, -(p.days - 1)));
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <SummaryCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="h-[60vh] min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {range.isError ? (
            <div className="flex h-full items-center justify-center text-sm text-rose-500">
              Failed to load points.
            </div>
          ) : points.length === 0 && !range.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No points in this range.
            </div>
          ) : (
            <TimelineMap
              points={points}
              groupKey={(p) => localDayOf(p.timestamp)}
            />
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 text-sm font-semibold">Distance per day</div>
          <DistancePerDayChart data={daily} />
        </div>
      </div>
    </div>
  );
}
