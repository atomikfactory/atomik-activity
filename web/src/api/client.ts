import axios from "axios";

const stored =
  typeof window !== "undefined" ? localStorage.getItem("aa-api-base") : null;

export const apiClient = axios.create({
  baseURL: stored ?? import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 15_000,
});

export function setApiBase(url: string) {
  apiClient.defaults.baseURL = url;
  localStorage.setItem("aa-api-base", url);
}

export function getApiBase(): string {
  return apiClient.defaults.baseURL ?? "/api";
}
