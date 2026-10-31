import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RawPoint } from "../../lib/stats";
import { useThemeStore } from "../../store/themeStore";
import { OSM_TILES, tileClassName } from "../../lib/tiles";
import { HeatLayer } from "./HeatLayer";
import { usePlaces } from "../../hooks/usePlaces";
import { getCategoryColor } from "../../lib/categories";

export type MapMode = "path" | "heat" | "both";

interface TimelineMapProps {
  points: RawPoint[];
  // When set, each group renders its own polyline so days don't get connected
  // by huge straight lines across the map.
  groupKey?: (p: RawPoint) => string;
  // Initial display mode; the in-map toggle can change it afterwards.
  initialMode?: MapMode;
  // Selection mode: renders every point as a clickable marker.
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onTogglePoint?: (id: string) => void;
}

function FitBounds({ points }: { points: RawPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14, {
        animate: false,
      });
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [32, 32], animate: false });
  }, [points, map]);
  return null;
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: MapMode;
  onChange: (next: MapMode) => void;
}) {
  const opts: Array<{ value: MapMode; label: string }> = [
    { value: "path", label: "Path" },
    { value: "heat", label: "Heat" },
    { value: "both", label: "Both" },
  ];
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control m-2 flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-md dark:border-slate-700 dark:bg-slate-900">
        {opts.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.value);
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              mode === o.value
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimelineMap({
  points,
  groupKey,
  initialMode = "path",
  selectionMode = false,
  selectedIds,
  onTogglePoint,
}: TimelineMapProps) {
  const theme = useThemeStore((s) => s.theme);
  const tileKey = theme;
  const [mode, setMode] = useState<MapMode>(initialMode);
  const places = usePlaces();

  const segments = useMemo(() => {
    if (points.length === 0) return [];
    if (!groupKey)
      return [points.map((p) => [p.latitude, p.longitude] as [number, number])];
    const groups = new Map<string, RawPoint[]>();
    for (const p of points) {
      const key = groupKey(p);
      const bucket = groups.get(key);
      if (bucket) bucket.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.values()).map((arr) =>
      arr.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
  }, [points, groupKey]);

  const heatPoints = useMemo<[number, number, number][]>(
    () => points.map((p) => [p.latitude, p.longitude, 0.6]),
    [points],
  );

  const first = points[0];
  const last = points.length > 1 ? points[points.length - 1] : undefined;
  const initialCenter: [number, number] = first
    ? [first.latitude, first.longitude]
    : [48.8566, 2.3522];

  const wrapRef = useRef<HTMLDivElement>(null);

  const showPath = mode === "path" || mode === "both";
  const showHeat = mode === "heat" || mode === "both";

  return (
    <div ref={wrapRef} className="h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={initialCenter}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={tileKey}
          url={OSM_TILES.url}
          attribution={OSM_TILES.attribution}
          maxZoom={OSM_TILES.maxZoom}
          className={tileClassName(theme)}
        />
        <FitBounds points={points} />

        {showHeat && <HeatLayer points={heatPoints} />}

        {(places.data ?? []).map((p) => {
          const color = getCategoryColor(p.category, p.color);
          return (
            <Circle
              key={p.id}
              center={[p.latitude, p.longitude]}
              radius={p.radiusM}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 2,
                dashArray: "4 4",
              }}
            >
              <Tooltip direction="top" offset={[0, -2]}>
                <span className="font-medium">{p.name}</span>
              </Tooltip>
            </Circle>
          );
        })}

        {showPath && (
          <>
            {segments.map((segment, i) => (
              <Polyline
                key={i}
                positions={segment}
                pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.85 }}
              />
            ))}
            {first && (
              <CircleMarker
                center={[first.latitude, first.longitude]}
                radius={6}
                pathOptions={{
                  color: "#16a34a",
                  fillColor: "#16a34a",
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            )}
            {last && (
              <CircleMarker
                center={[last.latitude, last.longitude]}
                radius={6}
                pathOptions={{
                  color: "#dc2626",
                  fillColor: "#dc2626",
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            )}
          </>
        )}

        {selectionMode && onTogglePoint && points.map((p) => {
          const selected = selectedIds?.has(p.id) ?? false;
          return (
            <CircleMarker
              key={p.id}
              center={[p.latitude, p.longitude]}
              radius={selected ? 7 : 5}
              pathOptions={{
                color: selected ? "#e11d48" : "#2563eb",
                fillColor: selected ? "#e11d48" : "#2563eb",
                fillOpacity: selected ? 0.9 : 0.35,
                weight: selected ? 2 : 1,
              }}
              eventHandlers={{ click: () => onTogglePoint(p.id) }}
            />
          );
        })}

        <ModeToggle mode={mode} onChange={setMode} />
      </MapContainer>
    </div>
  );
}
