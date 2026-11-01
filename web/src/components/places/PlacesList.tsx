import { Pencil, MapPin } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import type { Place, PlaceStat } from "../../api/places";
import { formatDuration } from "../../lib/format";
import { getCategoryColor, getCategoryMeta } from "../../lib/categories";

interface Props {
  places: Place[];
  stats: PlaceStat[];
  isLoading: boolean;
  onEdit: (place: Place) => void;
}

export function PlacesList({ places, stats, isLoading, onEdit }: Props) {
  const byId = new Map(stats.map((s) => [s.placeId, s]));
  const maxDwell = stats.reduce((m, s) => Math.max(m, s.totalDwellMs), 0);

  // Sort by dwell desc when stats are available, else alphabetical
  const sorted = [...places].sort((a, b) => {
    const da = byId.get(a.id)?.totalDwellMs ?? 0;
    const db = byId.get(b.id)?.totalDwellMs ?? 0;
    if (da !== db) return db - da;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-600" />
          <div className="text-sm font-semibold">My places</div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          time spent in the selected range
        </span>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No places yet. Use "Add place" or pick from the suggestions on the
            right.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((p) => {
              const stat = byId.get(p.id);
              const dwell = stat?.totalDwellMs ?? 0;
              const visits = stat?.visitCount ?? 0;
              const pct = maxDwell > 0 ? (dwell / maxDwell) * 100 : 0;
              const meta = getCategoryMeta(p.category);
              const color = getCategoryColor(p.category, p.color);
              return (
                <li key={p.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-900"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium">
                          {p.name}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDuration(dwell)} · {visits} visit
                        {visits === 1 ? "" : "s"} · r={p.radiusM}m
                      </div>
                    </div>
                    <button
                      onClick={() => onEdit(p)}
                      className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {maxDwell > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
