import { apiClient } from "./client";

export type PlaceCategory = "home" | "work" | "recurring" | "other" | string;

export interface Place {
  id: string;
  userId: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  radiusM: number;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceStat {
  placeId: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  radiusM: number;
  color?: string | null;
  totalDwellMs: number;
  visitCount: number;
}

export interface PlaceSuggestion {
  latitude: number;
  longitude: number;
  totalDwellMs: number;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface CreatePlace {
  name: string;
  category?: PlaceCategory;
  latitude: number;
  longitude: number;
  radiusM?: number;
  color?: string | null;
}

export type UpdatePlace = Partial<CreatePlace>;

export async function fetchPlaces(): Promise<Place[]> {
  const { data } = await apiClient.get<Place[]>("/places/");
  return data;
}

export async function createPlace(body: CreatePlace): Promise<Place> {
  const { data } = await apiClient.post<Place>("/places/", body);
  return data;
}

export async function updatePlace(id: string, body: UpdatePlace): Promise<Place> {
  const { data } = await apiClient.patch<Place>(`/places/${id}`, body);
  return data;
}

export async function deletePlace(id: string): Promise<void> {
  await apiClient.delete(`/places/${id}`);
}

export async function fetchPlaceSuggestions(
  from: string,
  to: string,
  minDwellMinutes: number = 30,
): Promise<PlaceSuggestion[]> {
  const { data } = await apiClient.get<PlaceSuggestion[]>("/places/suggest", {
    params: { from, to, minDwellMinutes },
  });
  return data;
}

export async function fetchPlaceStats(from: string, to: string): Promise<PlaceStat[]> {
  const { data } = await apiClient.get<PlaceStat[]>("/places/stats", {
    params: { from, to },
  });
  return data;
}
