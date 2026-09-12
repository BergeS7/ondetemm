import { ApiClient } from "./api-client";

// A relative "/api" only resolves for browser requests (via the Vite dev proxy, or a
// same-origin reverse proxy in production). Server-side rendering has no page origin and
// no dev proxy to fall back on, so it needs an absolute URL — resolved separately here.
function resolveApiBase(): string {
  const configured = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "");
  if (typeof window !== "undefined") return configured || "/api";
  const ssrConfigured = (
    typeof process !== "undefined" ? process.env?.["SSR_API_URL"] : undefined
  )?.replace(/\/$/, "");
  const absolute = ssrConfigured || (configured && /^https?:\/\//.test(configured) ? configured : undefined);
  if (absolute) return absolute;
  if (import.meta.env.DEV) return "http://127.0.0.1:3001/api"; // matches vite.config.ts's dev proxy target
  // eslint-disable-next-line no-console
  console.error(
    "SSR_API_URL (or an absolute VITE_API_URL) is not set: server-rendered pages cannot reach the backend " +
      "and will fall back to client-side fetching only, losing SSR content and SEO metadata. " +
      "Set SSR_API_URL to the backend's URL as reachable from the server process.",
  );
  return "/api";
}
export const API_BASE = resolveApiBase();
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
  instagram?: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  rejection_reason: string | null;
  category_ids?: string[];
  logo_url?: string | null;
  cover_url?: string | null;
  verified?: boolean;
  average_rating?: string | number;
  reviews_count?: number;
}
export interface Plan {
  id: string;
  code: "FREE" | "FEATURED" | "PREMIUM";
  name: string;
  description: string;
  price_monthly: string | number;
  limits: Record<string, unknown>;
  ranking_weight: number;
}
export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  provider: string;
  provider_subscription_id: string | null;
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  amount: string | number;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
}
export interface AnalyticsSummary {
  profileViews: number;
  whatsappClicks: number;
  phoneClicks: number;
  routeClicks: number;
  instagramClicks: number;
  websiteClicks: number;
  promotionClicks: number;
  period: string;
  timezone: string;
  series: Array<Record<string, unknown>>;
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
  event_type: "PROFILE_VIEW" | "WHATSAPP_CLICK" | "PHONE_CLICK" | "INSTAGRAM_CLICK" | "ROUTE_CLICK",
) {
  let session_id: string | undefined;
  try {
    session_id = sessionStorage.getItem("onde-tem-visit") ?? crypto.randomUUID();
    sessionStorage.setItem("onde-tem-visit", session_id);
  } catch {
    /* Tracking still accepts an anonymous event. */
  }
  return api
    .request("/events", { method: "POST", body: { company_id, event_type, session_id } })
    .catch(() => {
      /* A metrics failure must not block the contact link. */
    });
}
