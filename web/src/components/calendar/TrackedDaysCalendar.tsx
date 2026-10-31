import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTrackedDates } from "../../hooks/useTracking";
import { Button } from "../ui/Button";
import { isoDay } from "../../lib/time";

interface Props {
  selected: string;
  onSelect: (date: string) => void;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TrackedDaysCalendar({ selected, onSelect }: Props) {
  const tracked = useTrackedDates();
  const trackedSet = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of tracked.data ?? []) m.set(d.date, d.count);
    return m;
  }, [tracked.data]);

  const [cursor, setCursor] = useState(() => {
    const [y, m] = selected.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const gridStart = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const dayOfWeek = (first.getDay() + 6) % 7; // shift so Monday = 0
    first.setDate(first.getDate() - dayOfWeek);
    return first;
  }, [cursor]);

  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      out.push(d);
    }
    return out;
  }, [gridStart]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{monthLabel}</div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            aria-label="Previous month"
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            aria-label="Next month"
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 },
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = isoDay(d);
          const inMonth = d.getMonth() === cursor.month;
          const count = trackedSet.get(iso) ?? 0;
          const isSelected = iso === selected;
          const isToday = iso === isoDay(new Date());
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={[
                "relative aspect-square rounded-md text-xs transition",
                inMonth
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-300 dark:text-slate-600",
                isSelected
                  ? "bg-brand-600 text-white"
                  : count > 0
                    ? "bg-brand-50 hover:bg-brand-100 dark:bg-brand-600/15 dark:hover:bg-brand-600/25"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                isToday && !isSelected
                  ? "ring-1 ring-inset ring-brand-500"
                  : "",
              ].join(" ")}
              title={count > 0 ? `${count} points` : undefined}
            >
              <span>{d.getDate()}</span>
              {count > 0 && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-600 dark:bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
