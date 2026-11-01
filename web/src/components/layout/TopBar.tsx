import { useEffect, useState } from "react";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import { useThemeStore } from "../../store/themeStore";
import { useHealth, useLatest } from "../../hooks/useTracking";
import { formatRelative } from "../../lib/format";
import { parseServerTimestamp } from "../../lib/time";

export function TopBar() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const queryClient = useQueryClient();
  const health = useHealth();
  const latest = useLatest();

  // Keep "now" in state (updated on a timer) so render stays pure.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const apiTone = health.isError ? "red" : health.data ? "green" : "amber";
  const apiLabel = health.isError
    ? "API offline"
    : health.data
      ? "API online"
      : "Connecting…";

  let syncPill: { tone: "green" | "amber" | "red" | "slate"; text: string } = {
    tone: "slate",
    text: "No data yet",
  };
  if (latest.data?.hasData && latest.data.latest) {
    const when = parseServerTimestamp(latest.data.latest.timestamp);
    const minutes = (now - when.getTime()) / 60_000;
    const tone = minutes < 60 ? "green" : minutes < 60 * 24 ? "amber" : "red";
    syncPill = { tone, text: `Synced ${formatRelative(when)}` };
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={apiTone}>{apiLabel}</StatusPill>
        <StatusPill tone={syncPill.tone}>{syncPill.text}</StatusPill>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          aria-label="Refresh"
          onClick={() => queryClient.invalidateQueries()}
          title="Refresh all data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          aria-label="Toggle theme"
          onClick={toggle}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
