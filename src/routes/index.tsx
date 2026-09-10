import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Search, MapPin, Store, ArrowRight, MessageCircle, CheckCircle2 } from "lucide-react";
import heroCity from "@/assets/hero-city.jpg";
import {
  api,
  allPages,
  queryString,
  message,
  apiImage,
  track,
  type State,
  type City,
  type Category,
  type SearchCompany,
  type Page,
} from "@/lib/api";
import { SiteShell, Loading, ErrorNotice, buttonClass, inputClass } from "@/components/site-shell";
const searchSchema = z.object({
  q: z.string().max(160).catch(""),
  state: z.string().max(2).catch("ma"),
  city: z.string().max(150).catch("santa-ines"),
  category: z.string().max(100).catch(""),
  neighborhood: z.string().max(120).catch(""),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  sort: z.enum(["relevance", "rating", "name", "recent"]).catch("relevance"),
  open_now: z.boolean().catch(false),
  has_promotion: z.boolean().catch(false),
});
export const Route = createFileRoute("/")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Onde Tem — Empresas e serviços no Maranhão" },
      {
        name: "description",
        content:
          "Encontre empresas, serviços e comércio local. Pesquise por cidade e categoria e fale diretamente pelo WhatsApp.",
      },
    ],
  }),
  component: Home,
});
type Filters = z.infer<typeof searchSchema>;
function SearchCard({ company: c }: { company: SearchCompany }) {
  const cover = apiImage(c.cover_url),
    logo = apiImage(c.logo_url),
    href = `/${c.state_code.toLowerCase()}/${c.city_slug}/${c.slug}`;
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <a
        href={href}
        aria-label={`Ver perfil de ${c.name}`}
        className="relative flex h-32 items-center justify-center bg-brand-soft"
      >
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Store className="h-10 w-10 text-brand/50" />
        )}
        {c.is_sponsored && (
          <span className="absolute left-3 top-3 rounded-full bg-warn px-3 py-1 text-xs font-semibold text-warn-foreground">
            Patrocinado
          </span>
        )}
      </a>
      <div className="p-5">
        <div className="flex items-start gap-3">
          {logo && (
            <img
              src={logo}
              alt=""
              className="h-11 w-11 rounded-full border border-border object-cover"
              loading="lazy"
            />
          )}
          <div>
            <a href={href} className="font-bold hover:text-brand">
              {c.name}
            </a>
            {c.verified && (
              <span className="mt-1 flex items-center gap-1 text-xs text-whats">
                <CheckCircle2 className="h-3 w-3" />
                Empresa verificada
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {c.short_description}
        </p>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {[c.neighborhood, c.city_name, c.state_code].filter(Boolean).join(" · ")}
        </p>
        {c.reviews_count > 0 && (
          <p className="mt-2 text-xs">
            ★ {Number(c.average_rating).toFixed(1)} · {c.reviews_count} avaliações
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <a
            href={href}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-brand"
          >
            Ver perfil
          </a>
          {c.whatsapp && (
            <a
              href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(c.id, "WHATSAPP_CLICK")}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-whats px-3 py-2 text-sm font-semibold text-whats-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
function Home() {
  const filters = Route.useSearch(),
    navigate = Route.useNavigate();
  const [draft, setDraft] = useState<Filters>(filters),
    [clientReady, setClientReady] = useState(false);
  useEffect(() => setClientReady(true), []);
  useEffect(() => setDraft(filters), [filters]);
  const states = useQuery({
    queryKey: ["states"],
    queryFn: ({ signal }) => allPages<State>("/states", signal),
    enabled: clientReady,
  });
  const stateId = states.data?.find((s) => s.code.toLowerCase() === draft.state.toLowerCase())?.id;
  const cities = useQuery({
    queryKey: ["cities", stateId],
    queryFn: ({ signal }) => allPages<City>(`/states/${stateId}/cities`, signal),
    enabled: clientReady && !!stateId,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => allPages<Category>("/categories", signal),
    enabled: clientReady,
  });
  const results = useQuery({
    queryKey: ["search", filters],
    queryFn: ({ signal }) =>
      api.request<Page<SearchCompany>>(`/search?${queryString({ ...filters, limit: 12 })}`, {
        signal,
      }),
    enabled: clientReady,
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    void navigate({ search: { ...draft, page: 1 } });
  }
  const catalogError = states.error ?? cities.error ?? categories.error;
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden border-b border-border">
        <img src={heroCity} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="absolute inset-0 bg-background/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-brand">
              MARANHÃO · COMÉRCIO LOCAL
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              O que você procura,
              <br />
              <span className="text-brand">encontre por aqui.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-foreground/80">
              Empresas e serviços da sua cidade, em um só lugar. Encontre, conheça e fale direto
              pelo WhatsApp.
            </p>
          </div>
          <form
            onSubmit={submit}
            className="mt-8 rounded-2xl border border-border bg-background p-4 shadow-lg sm:p-5"
          >
            <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
              <label className="block text-xs font-semibold">
                O que você procura?
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={draft.q}
                    onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                    maxLength={160}
                    placeholder="Restaurante, barbearia, oficina…"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>
              <label className="block text-xs font-semibold">
                Estado
                <select
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value, city: "" }))}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Todos os estados</option>
                  {states.data?.map((s) => (
                    <option key={s.id} value={s.code.toLowerCase()}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Cidade
                <select
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  disabled={!stateId || cities.isPending}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Todas as cidades</option>
                  {cities.data?.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className={`${buttonClass} lg:self-end`} type="submit">
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
            <div className="mt-4 grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-semibold">
                Categoria
                <select
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="">Todas as categorias</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Bairro
                <input
                  value={draft.neighborhood}
                  onChange={(e) => setDraft((d) => ({ ...d, neighborhood: e.target.value }))}
                  maxLength={120}
                  placeholder="Qualquer bairro"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block text-xs font-semibold">
                Ordenar por
                <select
                  value={draft.sort}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sort: e.target.value as Filters["sort"] }))
                  }
                  className={`${inputClass} mt-1.5`}
                >
                  <option value="relevance">Relevância</option>
                  <option value="name">Nome</option>
                  <option value="recent">Mais recentes</option>
                  <option value="rating">Avaliação</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-4 py-3 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.open_now}
                    onChange={(e) => setDraft((d) => ({ ...d, open_now: e.target.checked }))}
                  />
                  Aberto agora
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.has_promotion}
                    onChange={(e) => setDraft((d) => ({ ...d, has_promotion: e.target.checked }))}
                  />
                  Com promoção
                </label>
              </div>
            </div>
          </form>
          {catalogError && (
            <ErrorNotice
              onRetry={() => {
                void states.refetch();
                void categories.refetch();
                if (stateId) void cities.refetch();
              }}
            >
              Não foi possível carregar os filtros. {message(catalogError)}
            </ErrorNotice>
          )}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10" aria-labelledby="resultados">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="resultados" className="text-2xl font-bold">
              Encontre empresas e serviços
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {results.data
                ? `${results.data.pagination.total} empresa${results.data.pagination.total === 1 ? " encontrada" : "s encontradas"}`
                : "Conheça os negócios da sua região."}
            </p>
          </div>
          <a
            href="/empresas/nova"
            className="flex items-center gap-2 text-sm font-semibold text-brand"
          >
            Sua empresa aqui <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        {results.isPending ? (
          <Loading text="Buscando empresas…" />
        ) : results.error ? (
          <ErrorNotice onRetry={() => void results.refetch()}>{message(results.error)}</ErrorNotice>
        ) : results.data.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
            <Store className="mx-auto mb-4 h-10 w-10 text-brand" />
            <h3 className="text-xl font-bold">Nenhuma empresa encontrada</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Experimente outra categoria ou cidade. Os cadastros aparecem aqui depois de aprovados.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                className="rounded-lg border border-border px-4 py-3 text-sm font-semibold"
                onClick={() =>
                  void navigate({
                    search: {
                      ...filters,
                      q: "",
                      category: "",
                      neighborhood: "",
                      city: "",
                      state: "",
                      open_now: false,
                      has_promotion: false,
                      page: 1,
                    },
                  })
                }
              >
                Limpar filtros
              </button>
              <a href="/empresas/nova" className={buttonClass}>
                Cadastrar empresa
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.data.data.map((c) => (
                <SearchCard key={c.id} company={c} />
              ))}
            </div>
            <div className="mt-8 flex items-center justify-center gap-5 text-sm">
              <button
                className="rounded-lg border border-border px-4 py-2 disabled:opacity-40"
                disabled={filters.page <= 1 || results.isFetching}
                onClick={() => void navigate({ search: { ...filters, page: filters.page - 1 } })}
              >
                Anterior
              </button>
              <span>
                Página {filters.page} de {results.data.pagination.totalPages}
              </span>
              <button
                className="rounded-lg border border-border px-4 py-2 disabled:opacity-40"
                disabled={filters.page >= results.data.pagination.totalPages || results.isFetching}
                onClick={() => void navigate({ search: { ...filters, page: filters.page + 1 } })}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>
      <section className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-brand-soft px-6 py-8 sm:px-9">
          <div>
            <h2 className="text-2xl font-bold">Seu negócio mais perto de novos clientes</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Crie sua conta, cadastre sua empresa gratuitamente e envie para aprovação.
            </p>
          </div>
          <a href="/empresas/nova" className={buttonClass}>
            Cadastrar minha empresa <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
