import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Pencil, Trash2, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { TimelineMap } from "../components/map/TimelineMap";
import { SummaryCards } from "../components/stats/SummaryCards";
import { TrackedDaysCalendar } from "../components/calendar/TrackedDaysCalendar";
import { useDaily, useDeletePoints, useDailySteps } from "../hooks/useTracking";
import { addDaysIso, todayIso } from "../lib/time";
import { computeDayStats, NO_POINTS } from "../lib/stats";
import { formatDate } from "../lib/format";

export function Dashboard() {
  const [date, setDate] = useState<string>(todayIso());
  const daily = useDaily(date);
  const dailySteps = useDailySteps(date);
  const deletePoints = useDeletePoints();
  const points = daily.data?.points ?? NO_POINTS;

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stats = useMemo(() => computeDayStats(points), [points]);

  const headerDate = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [date]);

  const changeDate = (next: string) => {
    setDate(next);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectedIds(new Set());
    setSelectMode(true);
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const togglePoint = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected point${selectedIds.size > 1 ? "s" : ""}?`)) return;
    await deletePoints.mutateAsync({ ids: Array.from(selectedIds), date });
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {formatDate(headerDate)}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {daily.isLoading
              ? "Loading…"
              : selectMode
              ? selectedIds.size === 0
                ? "Click points on the map to select them"
                : `${selectedIds.size} point${selectedIds.size > 1 ? "s" : ""} selected`
              : `${stats.pointsCount} points recorded`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button
                variant="ghost"
                onClick={cancelSelectMode}
                disabled={deletePoints.isPending}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={selectedIds.size === 0 || deletePoints.isPending}
                className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
              >
                <Trash2 className="h-4 w-4" />
                Delete {selectedIds.size > 0 ? selectedIds.size : ""}
              </Button>
            </>
          ) : (
            <>
              {points.length > 0 && (
                <Button variant="ghost" onClick={enterSelectMode}>
                  <Pencil className="h-4 w-4" />
                  Edit points
                </Button>
              )}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                <Button
                  variant="ghost"
                  aria-label="Previous day"
                  onClick={() => changeDate(addDaysIso(date, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={date}
                    max={todayIso()}
                    onChange={(e) => changeDate(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  aria-label="Next day"
                  onClick={() => changeDate(addDaysIso(date, 1))}
                  disabled={date >= todayIso()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => changeDate(todayIso())}
                  className="ml-1"
                >
                  Today
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <SummaryCards stats={stats} steps={dailySteps.data?.steps ?? null} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-[60vh] min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {daily.isError ? (
            <div className="flex h-full items-center justify-center text-sm text-rose-500">
              Failed to load points.
            </div>
          ) : points.length === 0 && !daily.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No points recorded on this day.
            </div>
          ) : (
            <TimelineMap
              points={points}
              selectionMode={selectMode}
              selectedIds={selectedIds}
              onTogglePoint={togglePoint}
            />
          )}
        </div>
        <TrackedDaysCalendar selected={date} onSelect={changeDate} />
      </div>
    </div>
  );
}
