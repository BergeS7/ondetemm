import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MapPin,
  Plus,
  User,
  UtensilsCrossed,
  Wrench,
  HeartPulse,
  Monitor,
  Flower2,
  Home,
  GraduationCap,
  Settings,
  Star,
  Tag,
  ChevronRight,
  ArrowRight,
  Check,
  Store,
  Pill,
  Fuel,
  ShoppingCart,
  School,
  Landmark,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
} from "lucide-react";

import heroCity from "@/assets/hero-city.jpg";
import bizChurrasco from "@/assets/biz-churrasco.jpg";
import bizMecanica from "@/assets/biz-mecanica.jpg";
import bizClinica from "@/assets/biz-clinica.jpg";
import bizSalao from "@/assets/biz-salao.jpg";
import promoBurger from "@/assets/promo-burger.jpg";
import promoPneu from "@/assets/promo-pneu.jpg";
import promoBeleza from "@/assets/promo-beleza.jpg";
import promoEntrega from "@/assets/promo-entrega.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guia Santa Inês — Empresas e serviços de Santa Inês - MA" },
      {
        name: "description",
        content:
          "Encontre restaurantes, clínicas, oficinas e serviços de Santa Inês - MA em um só lugar. Promoções do dia e cadastro gratuito para empresas.",
      },
      { property: "og:title", content: "Guia Santa Inês — Comércio e serviços da cidade" },
      {
        property: "og:description",
        content:
          "O guia completo de empresas, comércios e serviços de Santa Inês - MA. Mais praticidade para você e mais oportunidades para os negócios locais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const navLinks = ["Início", "Categorias", "Para empresas", "Blog", "Contato"];

const quickLinks = [
  { label: "Restaurantes", icon: UtensilsCrossed },
  { label: "Farmácias", icon: Pill },
  { label: "Postos de gasolina", icon: Fuel },
  { label: "Supermercados", icon: ShoppingCart },
  { label: "Escolas", icon: School },
  { label: "Bancos", icon: Landmark },
];

const categories = [
  { label: "Restaurantes", icon: UtensilsCrossed, tone: "text-chart-1" },
  { label: "Oficinas", icon: Wrench, tone: "text-brand" },
  { label: "Saúde", icon: HeartPulse, tone: "text-danger" },
  { label: "Tecnologia", icon: Monitor, tone: "text-chart-4" },
  { label: "Beleza", icon: Flower2, tone: "text-chart-5" },
  { label: "Imóveis", icon: Home, tone: "text-whats" },
  { label: "Educação", icon: GraduationCap, tone: "text-warn" },
  { label: "Serviços", icon: Settings, tone: "text-muted-foreground" },
];

const businesses = [
  {
    name: "Churrasco & Cia",
    type: "Restaurante",
    area: "Centro - Santa Inês",
    rating: "4,8",
    reviews: "124 avaliações",
    image: bizChurrasco,
    initials: "CC",
  },
  {
    name: "Auto Mecânica Brasil",
    type: "Oficina Mecânica",
    area: "Vila Militar",
    rating: "4,6",
    reviews: "98 avaliações",
    image: bizMecanica,
    initials: "AB",
  },
  {
    name: "Clínica Vida Mais",
    type: "Clínica Médica",
    area: "Centro",
    rating: "4,9",
    reviews: "87 avaliações",
    image: bizClinica,
    initials: "VM",
  },
  {
    name: "Studio Bella Mulher",
    type: "Beleza e Estética",
    area: "Cohab",
    rating: "4,7",
    reviews: "56 avaliações",
    image: bizSalao,
    initials: "BM",
  },
];

const promos = [
  {
    tag: "20% OFF",
    tagTone: "bg-danger text-danger-foreground",
    title: "Churrasco & Cia",
    line1: "Todo o cardápio de hambúrgueres",
    line2: "Válido até 30/04",
    image: promoBurger,
  },
  {
    tag: "Troca de óleo",
    tagTone: "bg-whats text-whats-foreground",
    title: "Auto Mecânica Brasil",
    line1: "Troca de óleo + filtro",
    line2: "A partir de R$ 199,90",
    image: promoPneu,
  },
  {
    tag: "Combo promocional",
    tagTone: "bg-chart-5 text-primary-foreground",
    title: "Studio Bella Mulher",
    line1: "Escova + Hidratação",
    line2: "De R$ 120,00 por R$ 89,90",
    image: promoBeleza,
  },
  {
    tag: "Frete grátis",
    tagTone: "bg-brand text-brand-foreground",
    title: "Mundo Tech",
    line1: "Em compras acima de R$ 200",
    line2: "Santa Inês e região",
    image: promoEntrega,
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative grid h-9 w-9 place-items-center rounded-full bg-brand-soft">
        <MapPin className="h-5 w-5 text-brand" strokeWidth={2.5} />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-whats" />
      </div>
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight text-foreground">
          Guia <span className="text-brand">Santa Inês</span>
        </p>
        {!compact && (
          <p className="text-[11px] text-muted-foreground">
            Comércio e serviços mais perto de você
          </p>
        )}
      </div>
    </div>
  );
}

function Stars() {
  return (
    <span className="flex items-center gap-0.5 text-warn">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Logo />
          <div className="relative order-3 w-full md:order-none md:w-72 lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="O que você procura?"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-brand"
            />
          </div>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-medium lg:flex">
            {navLinks.map((l, i) => (
              <a
                key={l}
                href="#"
                className={
                  i === 0
                    ? "border-b-2 border-brand pb-1 text-brand"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {l}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-whats px-4 text-sm font-semibold text-whats-foreground transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" /> Cadastrar empresa
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">
              <User className="h-4 w-4" /> Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroCity}
          alt="Vista aérea de Santa Inês - MA com a igreja matriz"
          width={1600}
          height={900}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                SANTA INÊS - MA
              </span>
              <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                Nossa cidade, mais conectada!
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              Encontre tudo em Santa Inês
              <br className="hidden md:block" /> em um só lugar
            </h1>
            <p className="mt-4 max-w-xl text-sm text-foreground/80 md:text-base">
              O guia completo de empresas, comércios e serviços de Santa Inês - MA. Mais
              praticidade para você e mais oportunidades para os negócios locais.
            </p>

            <div className="mt-6 flex flex-col gap-2 rounded-xl bg-background p-2 shadow-lg md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="O que você procura? (ex.: restaurante, clínica, oficina...)"
                  className="h-11 w-full rounded-lg bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="relative md:w-60">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Em qual bairro?"
                  className="h-11 w-full rounded-lg border-l border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-7 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90">
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-foreground/80">
              {quickLinks.map(({ label, icon: Icon }) => (
                <a key={label} href="#" className="flex items-center gap-1.5 hover:text-brand">
                  <Icon className="h-4 w-4 text-brand" /> {label}
                </a>
              ))}
            </div>
          </div>

          <p className="pointer-events-none absolute right-8 top-10 hidden text-right lg:block">
            <span className="block font-script text-3xl text-primary-foreground">Santa Inês</span>
            <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              Terra de gente
              <br />
              que faz a diferença
            </span>
          </p>
          <div className="absolute bottom-8 right-8 hidden max-w-52 rounded-xl bg-primary/90 p-4 text-primary-foreground lg:block">
            <MapPin className="mb-2 h-4 w-4" />
            <p className="text-xs font-medium leading-snug">
              Comércio local mais forte, uma cidade ainda melhor!
            </p>
            <span className="mt-2 block h-1 w-8 rounded-full bg-whats" />
          </div>
        </div>
      </section>

      {/* Categorias + mapa */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {categories.map(({ label, icon: Icon, tone }) => (
              <a
                key={label}
                href="#"
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-6 transition-shadow hover:shadow-md"
              >
                <Icon className={`h-7 w-7 ${tone}`} />
                <span className="text-sm font-medium">{label}</span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-brand-soft p-4">
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="h-4 w-4 text-brand" /> Explore empresas perto de você
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Veja no mapa os melhores estabelecimentos de Santa Inês.
              </p>
              <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground">
                Ver mapa da cidade <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative hidden h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <MapPin className="h-6 w-6 text-danger" />
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-background px-2 py-0.5 text-[10px] font-medium">
                Santa Inês - MA
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Empresas em destaque */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Star className="h-5 w-5 fill-current text-warn" /> Empresas em destaque
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conheça algumas das empresas que fazem a diferença em Santa Inês.
            </p>
          </div>
          <a href="#" className="flex items-center gap-1 text-sm font-medium text-brand">
            Ver todas as empresas <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {businesses.map((b) => (
            <article
              key={b.name}
              className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative">
                <img
                  src={b.image}
                  alt={b.name}
                  loading="lazy"
                  width={800}
                  height={520}
                  className="h-32 w-full object-cover"
                />
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-warn px-2.5 py-1 text-[11px] font-bold text-warn-foreground">
                  <Star className="h-3 w-3 fill-current" /> Destaque
                </span>
              </div>
              <div className="flex gap-3 p-4">
                <div className="-mt-10 grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-card bg-primary text-sm font-bold text-primary-foreground">
                  {b.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold">{b.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" /> {b.type}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {b.area}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <Stars />
                    <span className="font-semibold">{b.rating}</span>
                    <span className="text-muted-foreground">({b.reviews})</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-whats text-xs font-semibold text-whats-foreground">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
                <button className="h-9 flex-1 rounded-lg border border-border text-xs font-semibold text-brand">
                  Ver perfil
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Promoções */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Tag className="h-5 w-5 text-warn" /> Promoções do dia
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aproveite as melhores ofertas das empresas de Santa Inês!
            </p>
          </div>
          <a href="#" className="flex items-center gap-1 text-sm font-medium text-brand">
            Ver todas as promoções <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {promos.map((p) => (
            <article
              key={p.title}
              className="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card pr-3 transition-shadow hover:shadow-md"
            >
              <img
                src={p.image}
                alt={p.title}
                loading="lazy"
                width={512}
                height={512}
                className="h-24 w-24 shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1 py-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${p.tagTone}`}
                >
                  {p.tag}
                </span>
                <h3 className="mt-1.5 truncate text-sm font-bold">{p.title}</h3>
                <p className="truncate text-xs text-muted-foreground">{p.line1}</p>
                <p className="truncate text-xs text-muted-foreground">{p.line2}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
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
          <button className="inline-flex h-12 items-center gap-2 rounded-lg bg-whats px-6 text-sm font-bold text-whats-foreground transition-opacity hover:opacity-90">
            Cadastrar agora <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
          </div>
          {[
            {
              title: "Categorias",
              items: ["Restaurantes", "Saúde", "Tecnologia", "Beleza"],
            },
            {
              title: "Empresas",
              items: ["Cadastrar empresa", "Planos e recursos", "Central do parceiro"],
            },
            {
              title: "Suporte",
              items: ["Fale conosco", "Dúvidas frequentes", "Ajuda"],
            },
            {
              title: "Termos",
              items: ["Termos de uso", "Política de privacidade", "Cookies"],
            },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {col.items.map((i) => (
                  <li key={i}>
                    <a href="#" className="hover:text-brand">
                      {i}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-sm font-bold">Siga nossas redes</h3>
            <div className="mt-3 flex gap-3 text-muted-foreground">
              <a href="#" aria-label="Instagram">
                <Instagram className="h-5 w-5 hover:text-brand" />
              </a>
              <a href="#" aria-label="Facebook">
                <Facebook className="h-5 w-5 hover:text-brand" />
              </a>
              <a href="#" aria-label="YouTube">
                <Youtube className="h-5 w-5 hover:text-brand" />
              </a>
              <a href="#" aria-label="WhatsApp">
                <MessageCircle className="h-5 w-5 hover:text-whats" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-[11px] text-muted-foreground">
            <p>© 2026 Guia Santa Inês. Todos os direitos reservados.</p>
            <p>Feito com ♥ para Santa Inês - MA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
