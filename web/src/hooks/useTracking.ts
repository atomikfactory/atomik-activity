import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePoints,
  fetchDaily,
  fetchHealth,
  fetchLatest,
  fetchRange,
  fetchTrackedDates,
} from "../api/tracking";
import { fetchDailySteps } from "../api/health";

export function useDaily(date: string) {
  return useQuery({
    queryKey: ["daily", date],
    queryFn: () => fetchDaily(date),
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useRange(from: string, to: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["range", from, to],
    queryFn: () => fetchRange(from, to),
    enabled: enabled && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useTrackedDates() {
  return useQuery({
    queryKey: ["dates"],
    queryFn: fetchTrackedDates,
    staleTime: 60_000,
  });
}

export function useLatest() {
  return useQuery({
    queryKey: ["latest"],
    queryFn: fetchLatest,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useDeletePoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[]; date: string }) => deletePoints(ids),
    onSuccess: (_data, { date }) => {
      queryClient.invalidateQueries({ queryKey: ["daily", date] });
      queryClient.invalidateQueries({ queryKey: ["dates"] });
    },
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useDailySteps(date: string) {
  return useQuery({
    queryKey: ["health-daily", date],
    queryFn: () => fetchDailySteps(date),
    enabled: !!date,
    staleTime: 60_000,
  });
}
