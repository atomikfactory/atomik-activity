import { haversineMeters } from "./distance";
import { localDayOf } from "./time";

export interface RawPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Stable empty list so `data?.points ?? NO_POINTS` doesn't change identity every render.
export const NO_POINTS: RawPoint[] = [];

export interface DayStats {
  totalDistanceM: number;
  pointsCount: number;
  coverageM: number; // bounding-box diagonal in meters
  firstPoint?: RawPoint;
  lastPoint?: RawPoint;
}

export function computeDayStats(points: RawPoint[]): DayStats {
  if (points.length === 0) {
    return { totalDistanceM: 0, pointsCount: 0, coverageM: 0 };
  }

  let total = 0;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
    if (i > 0) total += haversineMeters(points[i - 1], p);
  }

  const coverageM =
    points.length > 1
      ? haversineMeters(
          { latitude: minLat, longitude: minLng },
          { latitude: maxLat, longitude: maxLng },
        )
      : 0;

  return {
    totalDistanceM: total,
    pointsCount: points.length,
    coverageM,
    firstPoint: points[0],
    lastPoint: points[points.length - 1],
  };
}

export interface DailyAggregate {
  date: string;
  distanceM: number;
  points: number;
}

export function aggregateByDay(points: RawPoint[]): DailyAggregate[] {
  if (points.length === 0) return [];
  const byDay = new Map<string, RawPoint[]>();
  for (const p of points) {
    const day = localDayOf(p.timestamp);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(p);
    else byDay.set(day, [p]);
  }
  const days: DailyAggregate[] = [];
  for (const [date, pts] of byDay) {
    const stats = computeDayStats(pts);
    days.push({
      date,
      distanceM: stats.totalDistanceM,
      points: pts.length,
    });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
