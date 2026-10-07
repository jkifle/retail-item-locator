import { apiFetch } from "./api";
import { cachedRequest, invalidateSessionCache } from "./sessionCache";

export interface Store {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  location_count: number;
}
export interface CompanyUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "staff" | "viewer";
  is_active: boolean;
}
export async function settingsRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const resource = path.split("?")[0];
  if (method === "GET" && ["/api/stores", "/api/users"].includes(resource) && !options?.signal) {
    return cachedRequest(path, () => requestSettings<T>(path, options));
  }
  const data = await requestSettings<T>(path, options);
  if (method !== "GET" && method !== "HEAD") {
    if (resource.startsWith("/api/stores")) invalidateSessionCache("/api/stores");
    if (resource.startsWith("/api/users")) invalidateSessionCache("/api/users");
  }
  return data;
}

async function requestSettings<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || result.error || "Unable to load settings");
  return result.data as T;
}
export const loadStores = () => settingsRequest<{ stores: Store[] }>("/api/stores");
