import { ApiClient } from "./api-client";
export const API_BASE =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") || "/api";
export const api = new ApiClient(API_BASE);
export interface Page<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export interface State {
  id: string;
  name: string;
  code: string;
}
export interface City {
  id: string;
  state_id: string;
  name: string;
  slug: string;
}
export interface Category {
  id: string;
  name: string;
  slug: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "COMPANY_OWNER" | "ADMIN";
}
export interface Company {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  state_id: string;
  city_id: string;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  rejection_reason: string | null;
  category_ids?: string[];
}
export interface SearchCompany {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  city_slug: string;
  city_name: string;
  state_code: string;
  neighborhood: string | null;
  whatsapp: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  average_rating: string | number;
  reviews_count: number;
  verified: boolean;
  is_open: boolean;
  is_sponsored: boolean;
  plan_code: string;
}
export function apiImage(url: string | null | undefined) {
  if (!url) return undefined;
  if (url.startsWith("/api/")) return `${API_BASE}${url.slice(4)}`;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.";
}
export function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}
export async function allPages<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  do {
    const response = await api.request<Page<T>>(
      `${path}${path.includes("?") ? "&" : "?"}limit=100&page=${page}`,
      signal ? { signal } : {},
    );
    items.push(...response.data);
    if (page >= response.pagination.totalPages) break;
    page++;
  } while (page <= 100);
  return items;
}
export function track(
  company_id: string,
  event_type: "PROFILE_VIEW" | "WHATSAPP_CLICK" | "PHONE_CLICK",
) {
  let session_id: string | undefined;
  try {
    session_id = sessionStorage.getItem("onde-tem-visit") ?? crypto.randomUUID();
    sessionStorage.setItem("onde-tem-visit", session_id);
  } catch {
    /* Tracking still accepts an anonymous event. */
  }
  void api
    .request("/events", { method: "POST", body: { company_id, event_type, session_id } })
    .catch(() => {
      /* A metrics failure must not block the contact link. */
    });
}
