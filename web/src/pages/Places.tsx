import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../components/ui/Button";
import { PlaceFormModal } from "../components/places/PlaceFormModal";
import { PlacesList } from "../components/places/PlacesList";
import { SuggestionList } from "../components/places/SuggestionList";
import { PlacesMap } from "../components/places/PlacesMap";
import {
  usePlaces,
  usePlaceStats,
  usePlaceSuggestions,
} from "../hooks/usePlaces";
import { addDaysIso, todayIso } from "../lib/time";
import type { Place, PlaceSuggestion } from "../api/places";

const presets: Array<{ label: string; days: number }> = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "365d", days: 365 },
];

export function Places() {
  const [from, setFrom] = useState<string>(addDaysIso(todayIso(), -29));
  const [to, setTo] = useState<string>(todayIso());

  const places = usePlaces();
  const stats = usePlaceStats(from, to);
  const suggestions = usePlaceSuggestions(from, to, 30);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Place | undefined>();
  const [initial, setInitial] = useState<
    | undefined
    | {
        name?: string;
        category?: string;
        latitude?: number;
        longitude?: number;
      }
  >();

  const openCreate = (preset?: Partial<{ latitude: number; longitude: number }>) => {
    setEditing(undefined);
    setInitial(preset);
    setModalOpen(true);
  };

  const openEdit = (place: Place) => {
    setEditing(place);
    setInitial(undefined);
    setModalOpen(true);
  };

  const onUseSuggestion = (s: PlaceSuggestion) => {
    openCreate({ latitude: s.latitude, longitude: s.longitude });
  };

  // Hide suggestions that are already covered by an existing place
  const visibleSuggestions = useMemo(() => {
    const existing = places.data ?? [];
    return (suggestions.data ?? []).filter((s) => {
      return !existing.some((p) => {
        const dLat = (p.latitude - s.latitude) * 111_000;
        const dLng =
          (p.longitude - s.longitude) *
          111_000 *
          Math.cos((p.latitude * Math.PI) / 180);
        const m = Math.sqrt(dLat * dLat + dLng * dLng);
        return m < Math.max(p.radiusM, 150);
      });
    });
  }, [suggestions.data, places.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Places</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Categorise the spots where you spend the most time and track them
            over any range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent px-2 py-1 text-sm focus:outline-hidden"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayIso()}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent px-2 py-1 text-sm focus:outline-hidden"
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
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add place
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="h-[55vh] min-h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <PlacesMap
              places={places.data ?? []}
              onAddAt={(lat, lng) => openCreate({ latitude: lat, longitude: lng })}
              onPlaceClick={openEdit}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tip: click anywhere on the map to add a place at that location.
          </p>
        </div>

        <div className="space-y-4">
          <PlacesList
            places={places.data ?? []}
            stats={stats.data ?? []}
            isLoading={places.isLoading || stats.isLoading}
            onEdit={openEdit}
          />
          <SuggestionList
            suggestions={visibleSuggestions}
            isLoading={suggestions.isLoading}
            onUse={onUseSuggestion}
          />
        </div>
      </div>

      <PlaceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        initial={initial}
      />
    </div>
  );
}
