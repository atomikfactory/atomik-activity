import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "../../api/places";
import { getCategoryColor } from "../../lib/categories";
import { useThemeStore } from "../../store/themeStore";
import { OSM_TILES, tileClassName } from "../../lib/tiles";

interface Props {
  places: Place[];
  onAddAt?: (lat: number, lng: number) => void;
  onPlaceClick?: (place: Place) => void;
}

function FitToPlaces({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(
      places.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
  }, [places, map]);
  return null;
}

function ClickHandler({ onAddAt }: { onAddAt?: (lat: number, lng: number) => void }) {
  useMapEvent("click", (e) => {
    if (onAddAt) onAddAt(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

export function PlacesMap({ places, onAddAt, onPlaceClick }: Props) {
  const theme = useThemeStore((s) => s.theme);

  const center = useMemo<[number, number]>(() => {
    if (places.length > 0) return [places[0].latitude, places[0].longitude];
    return [48.8566, 2.3522];
  }, [places]);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={theme}
          url={OSM_TILES.url}
          attribution={OSM_TILES.attribution}
          maxZoom={OSM_TILES.maxZoom}
          className={tileClassName(theme)}
        />
        <FitToPlaces places={places} />
        {onAddAt && <ClickHandler onAddAt={onAddAt} />}
        {places.map((p) => {
          const color = getCategoryColor(p.category, p.color);
          return (
            <Circle
              key={p.id}
              center={[p.latitude, p.longitude]}
              radius={p.radiusM}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.25,
                weight: 2,
              }}
              eventHandlers={
                onPlaceClick ? { click: () => onPlaceClick(p) } : undefined
              }
            >
              <Tooltip direction="top" offset={[0, -2]} permanent={false}>
                <span className="font-medium">{p.name}</span>
              </Tooltip>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
