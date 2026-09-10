import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapPin, MessageCircle, Phone, Store } from "lucide-react";
import {
  api,
  apiImage,
  message,
  track,
  type SearchCompany,
  type Category,
  type Page as ApiPage,
} from "@/lib/api";
import { SiteShell, Loading, ErrorNotice, buttonClass } from "@/components/site-shell";
interface PublicProfile {
  company: SearchCompany & { description: string; street: string | null; number: string | null };
  categories: ApiPage<Category>;
  hours: ApiPage<{
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }>;
  openStatus: "OPEN" | "CLOSED";
}
export const Route = createFileRoute("/$state/$city/$slug")({ component: Page });
function Page() {
  const params = Route.useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const profile = useQuery({
    queryKey: ["public-company", params],
    queryFn: ({ signal }) =>
      api.request<PublicProfile>(
        `/public/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}/companies/${encodeURIComponent(params.slug)}?limit=100`,
        { signal },
      ),
    enabled: ready,
  });
  const company = profile.data?.company;
  const companyId = company?.id;
  useEffect(() => {
    if (companyId) track(companyId, "PROFILE_VIEW");
  }, [companyId]);
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <a href="/" className="mb-6 inline-block text-sm text-brand">
          ← Voltar à busca
        </a>
        {profile.isPending ? (
          <Loading text="Carregando empresa…" />
        ) : profile.error ? (
          <ErrorNotice onRetry={() => void profile.refetch()}>{message(profile.error)}</ErrorNotice>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="flex h-48 items-center justify-center bg-brand-soft">
                {apiImage(profile.data.company.cover_url) ? (
                  <img
                    src={apiImage(profile.data.company.cover_url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-16 w-16 text-brand/40" />
                )}
              </div>
              <div className="p-6 sm:p-8">
                {profile.data.company.is_sponsored && (
                  <span className="mb-3 inline-block rounded-full bg-warn px-3 py-1 text-xs font-semibold">
                    Patrocinado
                  </span>
                )}
                <h1 className="text-3xl font-bold">{profile.data.company.name}</h1>
                <p className="mt-2 text-muted-foreground">
                  {profile.data.categories.data.map((c) => c.name).join(" · ")}
                </p>
                <p className="mt-5 whitespace-pre-line text-sm leading-7">
                  {profile.data.company.description}
                </p>
                <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {[
                    profile.data.company.street,
                    profile.data.company.number,
                    profile.data.company.neighborhood,
                    profile.data.company.city_name,
                    profile.data.company.state_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {profile.data.company.whatsapp && (
                    <a
                      className={`${buttonClass} bg-whats`}
                      href={`https://wa.me/${profile.data.company.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track(profile.data.company.id, "WHATSAPP_CLICK")}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Conversar no WhatsApp
                    </a>
                  )}
                  {profile.data.company.phone && (
                    <a
                      href={`tel:${profile.data.company.phone.replace(/[^\d+]/g, "")}`}
                      onClick={() => track(profile.data.company.id, "PHONE_CLICK")}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold"
                    >
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold">Horários de atendimento</h2>
              {profile.data.hours.data.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Horários ainda não informados. Confirme pelo contato da empresa.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-brand">
                    {profile.data.openStatus === "OPEN" ? "Aberto agora" : "Fechado agora"}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {profile.data.hours.data.map((h, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>
                          {
                            [
                              "Domingo",
                              "Segunda-feira",
                              "Terça-feira",
                              "Quarta-feira",
                              "Quinta-feira",
                              "Sexta-feira",
                              "Sábado",
                            ][h.day_of_week]
                          }
                        </span>
                        <span>
                          {h.is_closed
                            ? "Fechado"
                            : `${h.opens_at?.slice(0, 5)} às ${h.closes_at?.slice(0, 5)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </SiteShell>
  );
}
