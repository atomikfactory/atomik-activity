import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyAggregate } from "../../lib/stats";
import { useThemeStore } from "../../store/themeStore";

interface Props {
  data: DailyAggregate[];
}

export function DistancePerDayChart({ data }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const stroke = theme === "dark" ? "#334155" : "#e2e8f0";
  const text = theme === "dark" ? "#94a3b8" : "#64748b";

  const series = data.map((d) => ({
    date: d.date.slice(5),
    km: +(d.distanceM / 1000).toFixed(2),
  }));

  if (series.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No data in this range.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={stroke} strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke={text} fontSize={11} />
          <YAxis stroke={text} fontSize={11} unit=" km" width={50} />
          <Tooltip
            contentStyle={{
              background: theme === "dark" ? "#0f172a" : "#fff",
              borderRadius: 8,
              border: `1px solid ${stroke}`,
              color: text,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} km`, "Distance"]}
          />
          <Bar dataKey="km" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
