import { apiClient } from "./client";
import type { RawPoint } from "../lib/stats";
import { browserTimeZone } from "../lib/time";

export interface DailyResponse {
  date: string;
  pointsCount: number;
  points: RawPoint[];
}

export interface RangeResponse {
  from: string;
  to: string;
  pointsCount: number;
  points: RawPoint[];
}

export interface TrackedDate {
  date: string;
  count: number;
}

export interface LatestResponse {
  hasData: boolean;
  latest?: RawPoint;
}

export async function fetchDaily(date: string): Promise<DailyResponse> {
  const { data } = await apiClient.get<DailyResponse>("/tracking/daily", {
    params: { date, tz: browserTimeZone() },
  });
  return data;
}

export async function fetchRange(
  from: string,
  to: string,
): Promise<RangeResponse> {
  const { data } = await apiClient.get<RangeResponse>("/tracking/range", {
    params: { from, to, tz: browserTimeZone() },
  });
  return data;
}

export async function fetchTrackedDates(): Promise<TrackedDate[]> {
  const { data } = await apiClient.get<TrackedDate[]>("/tracking/dates", {
    params: { tz: browserTimeZone() },
  });
  return data;
}

export async function fetchLatest(): Promise<LatestResponse> {
  const { data } = await apiClient.get<LatestResponse>("/tracking/latest");
  return data;
}

export async function deletePoints(ids: string[]): Promise<{ deleted: number }> {
  const { data } = await apiClient.delete<{ deleted: number }>("/tracking/points", {
    data: { ids },
  });
  return data;
}

export async function fetchHealth(): Promise<{ status: string }> {
  const { data } = await apiClient.get<{ status: string }>("/ping");
  return data;
}
