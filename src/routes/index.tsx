import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  Pill,
  Fuel,
  ShoppingCart,
  School,
  Landmark,
  SlidersHorizontal,
  Search,
  MapPin,
  Store,
  ArrowRight,
  MessageCircle,
  UtensilsCrossed,
  Wrench,
  HeartPulse,
  Monitor,
  Flower2,
  Home as HomeIcon,
  GraduationCap,
  Settings,
  Star,
  Tag,
  Check,
  Car,
  Hammer,
  Building2,
  Plane,
  Dumbbell,
  PawPrint,
  PartyPopper,
  Shirt,
  Truck,
  Tractor,
  Factory,
  Shield,
  ShieldCheck,
  Church,
  Ticket,
  Megaphone,
  Briefcase,
  Music,
  Baby,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import {
  SiteShell,
  Loading,
  ErrorNotice,
  buttonClass,
  inputClass,
  CoverPlaceholder,
} from "@/components/site-shell";
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
const categoryTiles = [
  { label: "Restaurantes", icon: UtensilsCrossed, tone: "text-chart-1" },
  { label: "Oficinas", icon: Wrench, tone: "text-brand" },
  { label: "Saúde", icon: HeartPulse, tone: "text-danger" },
  { label: "Tecnologia", icon: Monitor, tone: "text-chart-4" },
  { label: "Beleza", icon: Flower2, tone: "text-chart-5" },
  { label: "Imóveis", icon: HomeIcon, tone: "text-whats" },
  { label: "Educação", icon: GraduationCap, tone: "text-warn" },
  { label: "Serviços", icon: Settings, tone: "text-muted-foreground" },
];
const extraCategoryTiles = [
  {
    label: "Alimentação e Bebidas",
    icon: UtensilsCrossed,
    tone: "text-chart-1",
    subcategories:
      "restaurantes, churrascarias, pizzarias, lanchonetes, hamburguerias, cafeterias, sorveterias, padarias, confeitarias, bares, distribuidoras, marmitarias, açaí, delivery",
  },
  {
    label: "Saúde",
    icon: HeartPulse,
    tone: "text-danger",
    subcategories:
      "clínicas, hospitais, dentistas, psicólogos, fisioterapeutas, nutricionistas, laboratórios, farmácias, óticas, fonoaudiólogos, veterinários",
  },
  {
    label: "Beleza e Estética",
    icon: Flower2,
    tone: "text-chart-5",
    subcategories:
      "barbearias, salões de beleza, manicures, design de sobrancelhas, estética facial, depilação, maquiagem, massagem, bronzeamento, clínicas de estética",
  },
  {
    label: "Automóveis e Motos",
    icon: Car,
    tone: "text-brand",
    subcategories:
      "oficinas, autopeças, borracharias, lava-jatos, elétrica automotiva, funilaria, pintura, alinhamento, som automotivo, concessionárias, aluguel de veículos, motopeças",
  },
  {
    label: "Tecnologia e Eletrônicos",
    icon: Monitor,
    tone: "text-chart-4",
    subcategories:
      "assistência técnica, lojas de celulares, informática, manutenção de computadores, provedores de internet, segurança eletrônica, câmeras, desenvolvimento de sistemas, eletrônicos",
  },
  {
    label: "Casa e Construção",
    icon: Hammer,
    tone: "text-warn",
    subcategories:
      "materiais de construção, eletricistas, encanadores, pedreiros, pintores, marceneiros, serralheiros, vidraçarias, marmorarias, móveis planejados, climatização, energia solar",
  },
  {
    label: "Comércio e Lojas",
    icon: ShoppingCart,
    tone: "text-chart-2",
    subcategories:
      "supermercados, mercadinhos, lojas de roupas, calçados, acessórios, cosméticos, variedades, presentes, papelarias, brinquedos, móveis, eletrodomésticos",
  },
  {
    label: "Educação",
    icon: GraduationCap,
    tone: "text-warn",
    subcategories:
      "escolas, faculdades, cursos profissionalizantes, idiomas, reforço escolar, autoescolas, professores particulares, cursos de informática, música e concursos",
  },
  {
    label: "Serviços Profissionais",
    icon: Briefcase,
    tone: "text-muted-foreground",
    subcategories:
      "advogados, contadores, consultores, engenheiros, arquitetos, designers, fotógrafos, marketing, despachantes, corretores, tradutores, desenvolvedores",
  },
  {
    label: "Serviços Domésticos",
    icon: Settings,
    tone: "text-muted-foreground",
    subcategories:
      "diaristas, limpeza, lavanderias, dedetização, jardinagem, montagem de móveis, mudanças, manutenção residencial, cuidadores",
  },
  {
    label: "Imóveis",
    icon: Building2,
    tone: "text-whats",
    subcategories:
      "imobiliárias, corretores, aluguel de imóveis, venda de imóveis, construtoras, administradoras de condomínio, loteamentos",
  },
  {
    label: "Turismo e Hospedagem",
    icon: Plane,
    tone: "text-chart-3",
    subcategories:
      "hotéis, pousadas, motéis, agências de viagem, guias turísticos, excursões, aluguel por temporada, transporte turístico",
  },
  {
    label: "Esporte e Fitness",
    icon: Dumbbell,
    tone: "text-danger",
    subcategories:
      "academias, personal trainers, crossfit, pilates, dança, artes marciais, futebol, natação, suplementos, lojas esportivas",
  },
  {
    label: "Pet",
    icon: PawPrint,
    tone: "text-chart-1",
    subcategories:
      "pet shops, clínicas veterinárias, banho e tosa, hotéis para animais, adestramento, ração, acessórios",
  },
  {
    label: "Eventos e Festas",
    icon: PartyPopper,
    tone: "text-chart-5",
    subcategories:
      "buffets, decoração, fotografia, filmagem, DJs, bandas, cerimonial, aluguel de mesas e cadeiras, som e iluminação, bolos e doces",
  },
  {
    label: "Moda e Vestuário",
    icon: Shirt,
    tone: "text-chart-2",
    subcategories:
      "roupas femininas, masculinas e infantis, moda fitness, íntima, calçados, bolsas, joias, semijoias, alfaiataria",
  },
  {
    label: "Financeiro",
    icon: Landmark,
    tone: "text-brand",
    subcategories:
      "bancos, cooperativas de crédito, correspondentes bancários, seguros, empréstimos, contabilidade, consórcios, investimentos",
  },
  {
    label: "Transporte e Logística",
    icon: Truck,
    tone: "text-chart-4",
    subcategories:
      "táxi, mototáxi, transporte executivo, fretes, transportadoras, entregas, mudanças, guincho",
  },
  {
    label: "Agronegócio e Rural",
    icon: Tractor,
    tone: "text-whats",
    subcategories:
      "lojas agropecuárias, veterinária rural, máquinas agrícolas, ração, fertilizantes, sementes, irrigação, assistência técnica rural",
  },
  {
    label: "Indústria e Empresas",
    icon: Factory,
    tone: "text-muted-foreground",
    subcategories:
      "fornecedores industriais, metalúrgicas, gráficas, embalagens, uniformes, equipamentos, manutenção industrial",
  },
  {
    label: "Segurança",
    icon: Shield,
    tone: "text-danger",
    subcategories:
      "vigilância, segurança patrimonial, alarmes, câmeras, cercas elétricas, chaveiros, rastreamento veicular",
  },
  {
    label: "Religião e Comunidade",
    icon: Church,
    tone: "text-chart-3",
    subcategories:
      "igrejas, templos, comunidades religiosas, livrarias religiosas, eventos religiosos",
  },
  {
    label: "Entretenimento e Lazer",
    icon: Ticket,
    tone: "text-chart-5",
    subcategories:
      "cinemas, clubes, parques, casas de eventos, bares, karaokês, jogos, festas, espaços recreativos",
  },
  {
    label: "Comunicação e Marketing",
    icon: Megaphone,
    tone: "text-brand",
    subcategories:
      "gráficas, agências de marketing, social media, publicidade, comunicação visual, impressão, letreiros",
  },
  {
    label: "Serviços Públicos e Utilidades",
    icon: Landmark,
    tone: "text-muted-foreground",
    subcategories:
      "cartórios, correios, serviços municipais, órgãos públicos, concessionárias de água e energia",
  },
  {
    label: "Empregos e Recursos Humanos",
    icon: Briefcase,
    tone: "text-chart-2",
    subcategories:
      "agências de emprego, recrutamento, consultorias de RH, cursos preparatórios, serviços de currículo",
  },
  {
    label: "Seguros e Proteção",
    icon: ShieldCheck,
    tone: "text-whats",
    subcategories:
      "seguros auto, vida, residencial, empresarial, proteção veicular, assistência 24 horas",
  },
  {
    label: "Música e Cultura",
    icon: Music,
    tone: "text-chart-4",
    subcategories:
      "escolas de música, estúdios, lojas de instrumentos, bandas, artistas, centros culturais",
  },
  {
    label: "Infantil",
    icon: Baby,
    tone: "text-chart-1",
    subcategories:
      "creches, escolas infantis, recreação, festas infantis, roupas infantis, brinquedos, pediatria",
  },
  {
    label: "Serviços para Empresas",
    icon: Settings,
    tone: "text-muted-foreground",
    subcategories:
      "contabilidade, TI, marketing, limpeza empresarial, segurança, impressão, consultoria, manutenção, treinamentos",
  },
  {
    label: "Compras e Atacado",
    icon: Package,
    tone: "text-warn",
    subcategories:
      "distribuidores, atacadistas, depósitos, fornecedores, representantes comerciais",
  },
];

type Filters = z.infer<typeof searchSchema>;
function SearchCard({ company: c }: { company: SearchCompany }) {
  const cover = apiImage(c.cover_url),
    logo = apiImage(c.logo_url),
    href = `/${c.state_code.toLowerCase()}/${c.city_slug}/${c.slug}`;
  const rating = Number(c.average_rating),
    initials = c.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <a
        href={href}
        aria-label={`Ver perfil de ${c.name}`}
        className="relative flex h-36 items-center justify-center overflow-hidden bg-brand-soft"
      >
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <CoverPlaceholder seed={c.id} />
        )}
        {c.is_sponsored && (
          <span
            title="Empresa patrocinada"
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#ffe687] px-3 py-1 text-xs font-bold leading-none text-slate-950"
          >
            <Star aria-hidden="true" className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            Destaque
          </span>
        )}
      </a>
      <div className="flex min-h-[96px] gap-4 px-4">
        <a
          href={href}
          aria-label={`Perfil de ${c.name}`}
          className="relative -mt-8 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white text-2xl font-bold text-brand shadow-sm"
        >
          {logo ? (
            <img
              src={logo}
              alt={`Logo de ${c.name}`}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <span>{initials}</span>
          )}
        </a>
        <div className="min-w-0 flex-1 pt-2.5">
          <a
            href={href}
            title={c.name}
            className="block truncate text-base font-bold leading-6 tracking-tight text-slate-950 hover:text-brand"
          >
            {c.name}
          </a>
          <p
            title={c.short_description}
            className="flex items-center gap-1.5 text-xs leading-5 text-slate-500"
          >
            <Store aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{c.short_description}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs leading-5 text-slate-500">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{c.neighborhood || c.city_name}</span>
          </p>
          {c.reviews_count > 0 ? (
            <div
              className="flex flex-wrap items-center gap-1.5 pb-1 text-xs leading-5"
              aria-label={`Nota ${rating.toLocaleString("pt-BR")}, ${c.reviews_count} avaliações`}
            >
              <span aria-hidden="true" className="flex gap-px text-amber-500">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-current" : ""}`}
                  />
                ))}
              </span>
              <strong className="text-slate-800">
                {rating.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </strong>
              <span className="text-[10px] text-slate-500">({c.reviews_count} avaliações)</span>
            </div>
          ) : (
            <p className="text-xs leading-5 text-slate-400">Ainda sem avaliações</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-2.5">
        {c.whatsapp ? (
          <a
            href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(c.id, "WHATSAPP_CLICK")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-500 bg-[#00a85a] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            WhatsApp
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-100 px-2 text-xs text-slate-500">
            Sem WhatsApp
          </span>
        )}
        <a
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-gradient-to-b from-white to-blue-50 px-3 py-2 text-sm font-semibold text-brand hover:bg-blue-50"
        >
          Ver perfil
        </a>
      </div>
    </article>
  );
}
function Home() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
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
  const promotions = useQuery({
    queryKey: ["promotions", filters.state, filters.city, filters.category],
    queryFn: ({ signal }) =>
      api.request<
        Page<{
          id: string;
          title: string;
          description: string | null;
          company_name: string;
          image_url: string | null;
          original_price: number | null;
          promotional_price: number | null;
          ends_at: string;
        }>
      >(
        "/promotions?" +
          queryString({
            state: filters.state,
            city: filters.city,
            category: filters.category,
            limit: 4,
          }),
        { signal },
      ),
    enabled: clientReady,
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    void navigate({ search: { ...draft, page: 1 } });
  }
  const catalogError = states.error ?? cities.error ?? categories.error;
  return (
    <SiteShell>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroCity}
          alt="Vista aérea de Santa Inês - MA com a igreja matriz"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-7">
          <div className="max-w-[840px] lg:pr-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                SANTA INÊS - MA
              </span>
              <span className="rounded-full bg-brand-teal-soft px-3 py-1 text-xs font-medium text-brand-teal">
                Nossa cidade, mais conectada!
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold leading-[1.02] tracking-tight text-foreground md:text-[44px]">
              Encontre tudo em{" "}
              <span className="relative whitespace-nowrap text-brand">
                Santa Inês
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 20"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-2.5 w-full text-brand-orange md:-bottom-2"
                >
                  <path
                    d="M2 14 C 80 4, 220 4, 298 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br className="hidden md:block" /> em um só lugar
            </h1>
            <p className="mt-2 max-w-[640px] text-sm leading-snug text-foreground/80 md:text-base">
              O guia completo de empresas, comércios e serviços de Santa Inês - MA. Mais praticidade
              para você e mais oportunidades para os negócios locais.
            </p>

            <form
              onSubmit={submit}
              className="mt-3 grid gap-1.5 rounded-lg border border-input bg-background p-1.5 shadow-sm sm:grid-cols-[1.75fr_1fr_auto]"
            >
              <label className="relative">
                <span className="sr-only">O que você procura?</span>
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="hero-search"
                  value={draft.q}
                  onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                  maxLength={160}
                  placeholder="O que você procura? (ex.: restaurante, clínica, oficina...)"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-2 text-xs outline-none focus:border-brand"
                />
              </label>
              <label className="relative">
                <span className="sr-only">Em qual bairro?</span>
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  value={draft.neighborhood}
                  onChange={(e) => setDraft((d) => ({ ...d, neighborhood: e.target.value }))}
                  maxLength={120}
                  placeholder="Em qual bairro?"
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-2 text-xs outline-none focus:border-brand"
                />
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-7 text-xs font-semibold text-brand-foreground"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
                <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Abrir filtros de busca"
                      title="Filtros"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand/30 text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="max-h-[min(75vh,560px)] w-[min(420px,calc(100vw-32px))] overflow-y-auto rounded-xl p-5"
                    aria-label="Filtros de busca"
                  >
                    <h2 className="text-base font-bold">Filtros de busca</h2>{" "}
                    <div className="mt-4 grid items-end gap-3 border-t border-border pt-4 sm:grid-cols-2">
                      {" "}
                      <label className="block text-xs font-semibold">
                        Estado
                        <select
                          value={draft.state}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, state: e.target.value, city: "" }))
                          }
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
                      <label className="block text-xs font-semibold">
                        <span className="scroll-mt-6">Categoria</span>
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
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, open_now: e.target.checked }))
                            }
                          />
                          Aberto agora
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.has_promotion}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, has_promotion: e.target.checked }))
                            }
                          />
                          Com promoção
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={buttonClass + " mt-3 w-full"}
                      onClick={() => {
                        void navigate({ search: { ...draft, page: 1 } });
                        setFiltersOpen(false);
                      }}
                    >
                      Aplicar filtros
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-medium">
              {[
                { label: "Restaurantes", icon: UtensilsCrossed },
                { label: "Farmácias", icon: Pill },
                { label: "Postos de gasolina", icon: Fuel },
                { label: "Supermercados", icon: ShoppingCart },
                { label: "Escolas", icon: School },
                { label: "Bancos", icon: Landmark },
              ].map(({ label, icon: Icon }) => {
                const match = categories.data?.find((c) => c.name === label);
                return (
                  <button
                    key={label}
                    onClick={() =>
                      void navigate({
                        search: {
                          ...filters,
                          q: match ? "" : label,
                          category: match?.slug ?? "",
                          page: 1,
                        },
                        hash: "resultados",
                      })
                    }
                    className="flex items-center gap-1.5 hover:text-brand"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="pointer-events-none absolute right-6 top-7 hidden text-right lg:block">
            <span className="block font-script text-4xl italic text-primary-foreground">
              Santa Inês
            </span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              Terra de gente
              <br />
              que faz a diferença
            </span>
          </p>
          <div className="absolute bottom-7 right-6 hidden max-w-44 rounded-xl bg-primary/90 p-4 text-primary-foreground lg:block">
            <MapPin className="mb-2 h-4 w-4" />
            <p className="text-xs font-medium leading-snug">
              Comércio local mais forte, uma cidade ainda melhor!
            </p>
            <span className="mt-2 block h-1 w-8 rounded-full bg-whats" />
          </div>
        </div>
      </section>
      <section id="categorias" className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {categoryTiles.map(({ label, icon: Icon, tone }) => {
                const aliases: Record<string, string> = {
                  Saúde: "Clínicas",
                  Beleza: "Salões",
                  Serviços: "Serviços profissionais",
                };
                const match = categories.data?.find((c) => c.name === (aliases[label] ?? label));
                return (
                  <button
                    key={label}
                    onClick={() =>
                      void navigate({
                        search: {
                          ...filters,
                          category: match?.slug ?? "",
                          q: match ? "" : label,
                          page: 1,
                        },
                        hash: "resultados",
                      })
                    }
                    className="flex aspect-square w-full flex-col items-center justify-center gap-3 self-start rounded-2xl border border-border bg-card p-2 transition-shadow hover:shadow-md"
                  >
                    <Icon className={"h-7 w-7 " + tone} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
            {showAllCategories && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                {extraCategoryTiles.map(({ label, icon: Icon, tone, subcategories }) => {
                  const match = categories.data?.find((c) => c.name === label);
                  return (
                    <button
                      key={label}
                      title={subcategories}
                      onClick={() =>
                        void navigate({
                          search: {
                            ...filters,
                            category: match?.slug ?? "",
                            q: match ? "" : label,
                            page: 1,
                          },
                          hash: "resultados",
                        })
                      }
                      className="flex aspect-square w-full flex-col items-center justify-center gap-3 self-start rounded-2xl border border-border bg-card p-2 text-center transition-shadow hover:shadow-md"
                    >
                      <Icon className={"h-7 w-7 " + tone} />
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                aria-expanded={showAllCategories}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft"
              >
                {showAllCategories ? "Menos categorias" : "Mais categorias"}
                {showAllCategories ? (
                  <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="grid min-h-32 grid-cols-[1.1fr_1fr] overflow-hidden rounded-xl border border-border bg-[#f0f8ff]">
            <div className="relative z-10 flex gap-2 px-3 py-3">
              <MapPin
                aria-hidden="true"
                className="mt-1 h-6 w-6 shrink-0 fill-brand-teal text-white"
              />
              <div className="min-w-0">
                <h3 className="text-xs font-bold leading-tight text-slate-950">
                  Explore empresas
                  <br />
                  perto de você
                </h3>
                <p className="mt-1 text-[10px] leading-snug text-slate-600">
                  Veja no mapa os melhores estabelecimentos de Santa Inês.
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=empresas+em+Santa+In%C3%AAs+MA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-brand/30 bg-white/80 px-2 py-1.5 text-[10px] font-semibold text-brand shadow-sm transition-colors hover:bg-white"
                >
                  Ver mapa da cidade <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=empresas+em+Santa+In%C3%AAs+MA"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir mapa de empresas em Santa Inês, MA"
              className="relative min-h-32 overflow-hidden bg-[#e9edf0] focus-visible:outline-2 focus-visible:outline-brand"
            >
              <svg
                viewBox="0 0 180 140"
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <title>Miniatura ilustrativa de mapa</title>
                <rect width="180" height="140" fill="#eaedef" />
                <path
                  d="M160 -10 Q115 25 143 58 T95 115 L82 150"
                  fill="none"
                  stroke="#acdcef"
                  strokeWidth="16"
                />
                <path d="M0 116 L44 107 72 122 69 145 0 145Z" fill="#cbe3c4" />
                <g fill="none" stroke="white" strokeWidth="2">
                  <path d="M5 0L35 140M36 0L62 140M66 0L93 140M99 0L125 140M-10 20L180 59M-10 46L180 85M-10 76L180 112M-10 106L180 142M5 140L155 0" />
                </g>
                <path
                  d="M116 -10L91 35 78 66 76 90 49 150"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                />
                <path
                  d="M116 -10L91 35 78 66 76 90 49 150"
                  fill="none"
                  stroke="#f5d881"
                  strokeWidth="4"
                />
              </svg>
              <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                <MapPin className="h-9 w-9 fill-rose-500 text-white drop-shadow" strokeWidth={2} />
                <span className="mt-1 whitespace-nowrap rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-900 shadow-sm">
                  Santa Inês - MA
                </span>
              </span>
            </a>
          </div>
        </div>{" "}
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
      </section>{" "}
      <section className="mx-auto max-w-7xl px-4 pt-4 pb-4" aria-labelledby="resultados">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="resultados" className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 text-warn" /> Empresas e serviços em Santa Inês
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {results.data.data.map((c) => (
                <SearchCard key={c.id} company={c} />
              ))}
            </div>
            {results.data.pagination.totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-5 text-sm">
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
                  disabled={
                    filters.page >= results.data.pagination.totalPages || results.isFetching
                  }
                  onClick={() => void navigate({ search: { ...filters, page: filters.page + 1 } })}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <section id="promocoes" className="mx-auto max-w-7xl px-4 pb-10">
        <div className="mb-2.5">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Tag className="h-5 w-5 fill-amber-400 text-amber-500" />
            Promoções do dia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aproveite as melhores ofertas das empresas da cidade!
          </p>
        </div>
        {promotions.isPending ? (
          <Loading text="Carregando promoções…" />
        ) : promotions.error ? (
          <ErrorNotice onRetry={() => void promotions.refetch()}>
            {message(promotions.error)}
          </ErrorNotice>
        ) : promotions.data.data.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Ainda não há promoções ativas para esta região.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {promotions.data.data.map((p, index) => (
              <article
                key={p.id}
                className="flex h-[124px] items-center gap-4 overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 pr-3 shadow-sm"
              >
                <div className="grid h-full w-[110px] shrink-0 place-items-center overflow-hidden rounded-lg bg-blue-50">
                  {apiImage(p.image_url) ? (
                    <img
                      src={apiImage(p.image_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Tag aria-hidden="true" className="h-9 w-9 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <span
                    title={p.title}
                    className={
                      "inline-block max-w-full truncate rounded-full px-3 py-1 align-middle text-xs font-semibold leading-5 text-white " +
                      ["bg-rose-500", "bg-emerald-500", "bg-pink-500", "bg-blue-500"][index % 4]
                    }
                  >
                    {p.title}
                  </span>
                  <h3
                    title={p.company_name}
                    className="mt-1 truncate text-base font-bold leading-6 text-slate-950"
                  >
                    {p.company_name}
                  </h3>
                  <p
                    title={p.description ?? undefined}
                    className="truncate text-sm leading-5 text-slate-600"
                  >
                    {p.description}
                  </p>
                  <p className="truncate text-xs leading-5 text-slate-500">
                    {p.promotional_price !== null ? (
                      <>
                        {p.original_price != null && (
                          <span>
                            De{" "}
                            <s>
                              {Number(p.original_price).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </s>{" "}
                            por{" "}
                          </span>
                        )}
                        <strong className="text-rose-500">
                          {Number(p.promotional_price).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </strong>
                      </>
                    ) : (
                      <>
                        Válido até{" "}
                        {new Date(p.ends_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          timeZone: "America/Fortaleza",
                        })}
                      </>
                    )}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {/* CTA */}
      <section id="para-empresas" className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-brand-soft p-6">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand">
            <Store className="h-7 w-7 text-brand-foreground" />
          </div>
          <div className="min-w-64 flex-1">
            <h2 className="text-xl font-extrabold text-brand">
              Sua empresa ainda não aparece aqui?
            </h2>
            <p className="mt-1 text-sm text-foreground/80">
              Cadastre gratuitamente e seja encontrado por milhares de pessoas em Santa Inês.
            </p>
          </div>
          <ul className="hidden gap-5 text-xs font-medium xl:flex">
            {["Mais visibilidade", "Novos clientes", "Divulgação gratuita"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-whats" /> {t}
              </li>
            ))}
          </ul>
          <a
            href="/empresas/nova"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-whats px-6 text-sm font-bold text-whats-foreground transition-opacity hover:opacity-90"
          >
            Cadastrar agora <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </SiteShell>
  );
}
