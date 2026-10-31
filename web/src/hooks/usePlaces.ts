import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlace,
  deletePlace,
  fetchPlaceStats,
  fetchPlaceSuggestions,
  fetchPlaces,
  updatePlace,
  type CreatePlace,
  type UpdatePlace,
} from "../api/places";

export function usePlaces() {
  return useQuery({
    queryKey: ["places"],
    queryFn: fetchPlaces,
    staleTime: 60_000,
  });
}

export function usePlaceStats(from: string, to: string) {
  return useQuery({
    queryKey: ["place-stats", from, to],
    queryFn: () => fetchPlaceStats(from, to),
    enabled: !!from && !!to,
    staleTime: 30_000,
  });
}

export function usePlaceSuggestions(
  from: string,
  to: string,
  minDwellMinutes: number = 30,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["place-suggest", from, to, minDwellMinutes],
    queryFn: () => fetchPlaceSuggestions(from, to, minDwellMinutes),
    enabled: enabled && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useCreatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlace) => createPlace(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["place-stats"] });
    },
  });
}

export function useUpdatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlace }) =>
      updatePlace(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["place-stats"] });
    },
  });
}

export function useDeletePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["places"] });
      qc.invalidateQueries({ queryKey: ["place-stats"] });
    },
  });
}
