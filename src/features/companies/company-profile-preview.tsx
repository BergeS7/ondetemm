import { useQuery } from "@tanstack/react-query";
import {
  api,
  allPages,
  type Page as ApiPage,
  type Company,
  type State,
  type City,
  type Category,
  type Plan,
  type Subscription,
} from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { PageLoading, ErrorNotice } from "@/components/site-shell";
import { CompanyProfileView, type PublicProfile, type EditSection } from "./company-profile-view";

interface PreviewCompany extends Company {
  zipcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
interface Media {
  id: string;
  url: string;
  preview_url: string;
  type: string;
}
type Hour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};
interface PrivateService {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_type: "FIXED" | "STARTING_AT" | "CONTACT";
  image_url: string | null;
  is_active: boolean;
}
interface PrivatePromotion {
  id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  promotional_price: number | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}
function page<T>(data: T[]): ApiPage<T> {
  return {
    data,
    pagination: { page: 1, limit: Math.max(data.length, 1), total: data.length, totalPages: 1 },
  };
}
function usePrivateList<T>(companyId: string, kind: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["private", auth.user?.id, "manage", companyId, kind],
    queryFn: ({ signal }) =>
      api.request<ApiPage<T>>(`/me/companies/${companyId}/${kind}?limit=100`, {
        authenticated: true,
        signal,
      }),
    enabled: !!companyId,
  });
}
function computeOpenStatus(hours: Hour[]): "OPEN" | "CLOSED" {
  if (!hours.length) return "CLOSED";
  const now = new Date();
  const today = hours.find((h) => h.day_of_week === now.getDay());
  if (!today || today.is_closed || !today.opens_at || !today.closes_at) return "CLOSED";
  const minutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  return minutes >= toMinutes(today.opens_at) && minutes <= toMinutes(today.closes_at)
    ? "OPEN"
    : "CLOSED";
}
export function CompanyProfilePreview({
  company,
  onEdit = () => {},
}: {
  company: Company;
  onEdit?: (section: EditSection) => void;
}) {
  const c = company as PreviewCompany;
  const states = useQuery({
    queryKey: ["states"],
    queryFn: ({ signal }) => allPages<State>("/states", signal),
  });
  const cities = useQuery({
    queryKey: ["cities", c.state_id],
    queryFn: ({ signal }) => allPages<City>(`/states/${c.state_id}/cities`, signal),
    enabled: !!c.state_id,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => allPages<Category>("/categories", signal),
  });
  const services = usePrivateList<PrivateService>(c.id, "services");
  const promotions = usePrivateList<PrivatePromotion>(c.id, "promotions");
  const hours = usePrivateList<Hour>(c.id, "hours");
  const images = usePrivateList<Media>(c.id, "images");
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: ({ signal }) => api.request<ApiPage<Plan>>("/plans?limit=10", { signal }),
  });
  const subscriptions = useQuery({
    queryKey: ["private", c.id, "subscriptions"],
    queryFn: ({ signal }) =>
      api.request<ApiPage<Subscription>>(`/companies/${c.id}/subscriptions?limit=5`, {
        authenticated: true,
        signal,
      }),
    enabled: !!c.id,
  });
  const loading =
    states.isPending ||
    cities.isPending ||
    categories.isPending ||
    services.isPending ||
    promotions.isPending ||
    hours.isPending ||
    images.isPending ||
    plans.isPending ||
    subscriptions.isPending;
  const error =
    states.error ??
    cities.error ??
    categories.error ??
    services.error ??
    promotions.error ??
    hours.error ??
    images.error ??
    plans.error ??
    subscriptions.error;
  if (loading) return <PageLoading text="Carregando prévia do perfil" />;
  if (error)
    return (
      <ErrorNotice
        onRetry={() => {
          void states.refetch();
          void cities.refetch();
          void categories.refetch();
          void services.refetch();
          void promotions.refetch();
          void hours.refetch();
          void images.refetch();
          void plans.refetch();
          void subscriptions.refetch();
        }}
      >
        Não foi possível carregar a prévia do perfil.
      </ErrorNotice>
    );
  const state = states.data?.find((s) => s.id === c.state_id);
  const city = cities.data?.find((x) => x.id === c.city_id);
  const live = subscriptions.data?.data.find((s) => s.status !== "CANCELED");
  const currentPlan = live
    ? plans.data?.data.find((p) => p.id === live.plan_id)
    : plans.data?.data.find((p) => p.code === "FREE");
  const hourRows = hours.data?.data ?? [];
  const openStatus = computeOpenStatus(hourRows);
  const now = new Date();
  const activePromotions = (promotions.data?.data ?? []).filter(
    (p) => p.is_active && new Date(p.starts_at) <= now && new Date(p.ends_at) > now,
  );
  const data: PublicProfile = {
    company: {
      id: c.id,
      name: c.name,
      slug: c.slug,
      short_description: c.short_description,
      description: c.description,
      city_slug: city?.slug ?? "",
      city_name: city?.name ?? "",
      state_code: state?.code ?? "",
      neighborhood: c.neighborhood,
      whatsapp: c.whatsapp,
      phone: c.phone,
      logo_url: c.logo_url ?? null,
      cover_url: c.cover_url ?? null,
      average_rating: c.average_rating ?? 0,
      reviews_count: c.reviews_count ?? 0,
      verified: c.verified ?? false,
      is_open: openStatus === "OPEN",
      is_sponsored: currentPlan?.code !== "FREE",
      plan_code: currentPlan?.code ?? "FREE",
      street: c.street,
      number: c.number,
      instagram: c.instagram ?? null,
      zipcode: c.zipcode ?? null,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      is_claimed: true,
    },
    categories: page((categories.data ?? []).filter((cat) => c.category_ids?.includes(cat.id))),
    services: page(
      (services.data?.data ?? [])
        .filter((s) => s.is_active)
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          price_type: s.price_type,
          image_url: s.image_url,
        })),
    ),
    gallery: page(
      (images.data?.data ?? [])
        .filter((img) => img.type === "GALLERY")
        .map((img) => ({ id: img.id, url: img.preview_url, type: img.type })),
    ),
    promotions: page(
      activePromotions.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        original_price: p.original_price,
        promotional_price: p.promotional_price,
        image_url: p.image_url,
      })),
    ),
    hours: page(hourRows),
    openStatus,
  };
  return <CompanyProfileView data={data} editable onEdit={onEdit} />;
}
