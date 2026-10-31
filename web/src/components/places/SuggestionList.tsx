import { Sparkles, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import type { PlaceSuggestion } from "../../api/places";
import { formatDuration } from "../../lib/format";
import { parseServerTimestamp } from "../../lib/time";

interface Props {
  suggestions: PlaceSuggestion[];
  isLoading: boolean;
  onUse: (s: PlaceSuggestion) => void;
}

export function SuggestionList({ suggestions, isLoading, onUse }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <div className="text-sm font-semibold">Suggested places</div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          ranked by total time spent
        </span>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Crunching points…
          </div>
        ) : suggestions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No clusters found in this range. Try widening the window.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.map((s, i) => (
              <li
                key={`${s.latitude}-${s.longitude}-${i}`}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-400">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium tabular-nums">
                    {formatDuration(s.totalDwellMs)}
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                      · {s.visitCount} visit{s.visitCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)} · first{" "}
                    {parseServerTimestamp(s.firstSeen).toLocaleDateString()},
                    last {parseServerTimestamp(s.lastSeen).toLocaleDateString()}
                  </div>
                </div>
                <Button variant="outline" onClick={() => onUse(s)}>
                  <Plus className="h-3.5 w-3.5" />
                  Use
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
