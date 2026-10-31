import { apiClient } from "./client";

export interface DailyHealthResponse {
  date: string;
  steps: number | null;
  stepsSource: string | null;
  sleep: unknown | null;
}

export async function fetchDailySteps(date: string): Promise<DailyHealthResponse> {
  const { data } = await apiClient.get<DailyHealthResponse>("/health/daily", {
    params: { date },
  });
  return data;
}
