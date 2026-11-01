import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { CATEGORY_OPTIONS } from "../../lib/categories";
import {
  useCreatePlace,
  useUpdatePlace,
  useDeletePlace,
} from "../../hooks/usePlaces";
import type { Place } from "../../api/places";

interface Props {
  open: boolean;
  onClose: () => void;
  // When `editing` is set, the form edits that place. Otherwise it creates a new
  // one with the `initial` values pre-filled (e.g. from a suggestion or map click).
  editing?: Place;
  initial?: {
    name?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radiusM?: number;
  };
}

export function PlaceFormModal({ open, ...rest }: Props) {
  // The form is mounted only while open, so its state is initialised from the
  // props each time the modal opens (or a different place is edited).
  if (!open) return null;
  return <PlaceForm key={rest.editing?.id ?? "new"} {...rest} />;
}

function PlaceForm({
  onClose,
  editing,
  initial,
}: Omit<Props, "open">) {
  const [name, setName] = useState(() => editing?.name ?? initial?.name ?? "");
  const [category, setCategory] = useState<string>(
    () => (editing ? editing.category : initial?.category) ?? "other",
  );
  const [lat, setLat] = useState<string>(() =>
    editing
      ? String(editing.latitude)
      : initial?.latitude !== undefined
        ? String(initial.latitude)
        : "",
  );
  const [lng, setLng] = useState<string>(() =>
    editing
      ? String(editing.longitude)
      : initial?.longitude !== undefined
        ? String(initial.longitude)
        : "",
  );
  const [radius, setRadius] = useState<string>(() =>
    editing
      ? String(editing.radiusM)
      : initial?.radiusM !== undefined
        ? String(initial.radiusM)
        : "75",
  );

  const create = useCreatePlace();
  const update = useUpdatePlace();
  const del = useDeletePlace();

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const radiusNum = parseInt(radius, 10);
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    Number.isFinite(radiusNum) &&
    radiusNum > 0;

  const submit = async () => {
    if (!valid) return;
    const body = {
      name: name.trim(),
      category,
      latitude: latNum,
      longitude: lngNum,
      radiusM: radiusNum,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, body });
    } else {
      await create.mutateAsync(body);
    }
    onClose();
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"?`)) return;
    await del.mutateAsync(editing.id);
    onClose();
  };

  const busy = create.isPending || update.isPending || del.isPending;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {editing ? "Edit place" : "Add place"}
          </h2>
          <button
            className="rounded-sm p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Home, Work, Mom's place…"
              className="input"
              autoFocus
            />
          </Field>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    category === c.key
                      ? c.badge + " ring-2"
                      : "bg-transparent text-slate-500 ring-slate-300 hover:bg-slate-100 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Radius (meters)">
            <input
              type="number"
              step="1"
              min="10"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {editing ? (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!valid || busy}>
              {editing ? "Save" : "Add place"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {children}
    </label>
  );
}
