import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type LatLngIntensity = [number, number, number?];

interface Props {
  points: LatLngIntensity[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

// Thin react-leaflet wrapper around leaflet.heat (which has no React types).
export function HeatLayer({ points, radius = 22, blur = 18, maxZoom = 17 }: Props) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = (L as any).heatLayer(points, { radius, blur, maxZoom }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, radius, blur, maxZoom]);
  return null;
}
