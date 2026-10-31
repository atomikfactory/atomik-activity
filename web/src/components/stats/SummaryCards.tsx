import type { ReactNode } from "react";
import { Activity, Footprints, Maximize2, Route } from "lucide-react";
import type { DayStats } from "../../lib/stats";
import { formatDistance } from "../../lib/format";

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-500">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
}

interface SummaryCardsProps {
  stats: DayStats;
  steps?: number | null;
}

export function SummaryCards({ stats, steps }: SummaryCardsProps) {
  const stepsValue =
    steps == null ? "—" : steps.toLocaleString();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={<Route className="h-3.5 w-3.5" />}
        label="Distance"
        value={formatDistance(stats.totalDistanceM)}
      />
      <StatCard
        icon={<Activity className="h-3.5 w-3.5" />}
        label="Points"
        value={stats.pointsCount.toLocaleString()}
      />
      <StatCard
        icon={<Maximize2 className="h-3.5 w-3.5" />}
        label="Coverage"
        value={formatDistance(stats.coverageM)}
        hint="bounding-box diagonal"
      />
      <StatCard
        icon={<Footprints className="h-3.5 w-3.5" />}
        label="Steps"
        value={stepsValue}
        hint={steps == null ? "no sensor data" : "from device sensor"}
      />
    </div>
  );
}
