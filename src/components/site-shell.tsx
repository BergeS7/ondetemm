import brandLogo from "@/assets/ondetemm-logo-v2.png";
import {
  Search,
  Plus,
  UserRound,
  LogOut,
  LoaderCircle,
  Home,
  LayoutGrid,
  Store,
  UtensilsCrossed,
  HeartPulse,
  Wrench,
  ShoppingBag,
  Scissors,
  GraduationCap,
  Building2,
  Car,
  Dumbbell,
  PawPrint,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/features/auth/auth-provider";
// UI-only guard: hides the admin link outside the designated admin account. The real
// authorization boundary is the ADMIN role, enforced by AdminAccess and the backend.
const ADMIN_EMAIL = "sergioberge07@gmail.com";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50";
const coverPalettes = [
  ["var(--brand)", "var(--brand-teal)"],
  ["var(--brand-orange)", "var(--warn)"],
  ["var(--brand-teal)", "var(--brand)"],
  ["var(--brand)", "var(--brand-orange)"],
  ["var(--danger)", "var(--brand-orange)"],
  ["var(--whats)", "var(--brand-teal)"],
];
const coverIcons = [
  UtensilsCrossed,
  HeartPulse,
  Wrench,
  ShoppingBag,
  Scissors,
  GraduationCap,
  Building2,
  Car,
  Dumbbell,
  PawPrint,
  Store,
];
function hashSeed(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}
export function CoverPlaceholder({ seed, className = "" }: { seed: string; className?: string }) {
  const h = hashSeed(seed);
  const [from, to] = coverPalettes[h % coverPalettes.length]!;
  const Icon = coverIcons[Math.floor(h / coverPalettes.length) % coverIcons.length]!;
  const gradientId = `cover-grad-${h}`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid slice"
      className={"h-full w-full " + className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${gradientId})`} />
      <circle cx={(h % 100) + 40} cy={20} r={55} fill="white" fillOpacity={0.08} />
      <circle cx={200 - ((h >> 3) % 60)} cy={110} r={45} fill="white" fillOpacity={0.08} />
      <Icon
        x={78}
        y={38}
        width={44}
        height={44}
        stroke="white"
        strokeOpacity={0.9}
        strokeWidth={1.4}
        fill="none"
      />
    </svg>
  );
}
export function Loading({ text = "Carregando…" }: { text?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </p>
  );
}
export function PageLoading({ text = "Carregando…" }: { text?: string }) {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-background"
    >
      <span
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-brand-soft"
        style={{ animation: "glow-pulse 2.6s ease-in-out infinite" }}
      />
      <div className="relative grid h-56 w-56 place-items-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-dashed border-brand-teal/50"
          style={{ animation: "ring-sweep 6s linear infinite" }}
        />
        <span
          className="absolute inset-6 rounded-full border border-dotted border-brand-orange/40"
          style={{ animation: "ring-sweep 4s linear infinite reverse" }}
        />
        <span className="absolute inset-12 rounded-full border border-brand/15" />
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-[2px] rounded-full bg-brand-teal/30"
            style={{ transform: `rotate(${i * 30}deg) translateY(-108px)` }}
          />
        ))}
        <span className="absolute inset-0" style={{ animation: "ring-sweep 2.2s linear infinite" }}>
          <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange shadow-[0_0_0_6px_rgba(232,134,43,0.2)]" />
        </span>
        <span
          className="absolute inset-0"
          style={{ animation: "ring-sweep 3.4s linear infinite reverse" }}
        >
          <span className="absolute left-1/2 top-3 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-teal shadow-[0_0_0_5px_rgba(30,150,164,0.2)]" />
        </span>
        <img
          src={brandLogo}
          alt="Ondetemm"
          className="relative h-auto w-40 object-contain drop-shadow-md"
          style={{ animation: "logo-breathe 1.8s ease-in-out infinite" }}
        />
      </div>
      <p className="relative flex items-center gap-1 text-base font-semibold text-brand">
        {text}
        <span className="inline-flex" aria-hidden="true">
          {[0, 0.16, 0.32].map((delay) => (
            <span
              key={delay}
              className="text-lg leading-none"
              style={{ animation: `loading-dot 1.3s ease-in-out ${delay}s infinite` }}
            >
              .
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}
export function ErrorNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
    >
      {children}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 font-semibold underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function SiteShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [leaving, setLeaving] = useState(false);
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/" });
  return (
    <div className="min-h-screen text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:block focus:p-3">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-brand-soft/70 shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_4px_16px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-brand-soft/50">
        <div className="mx-auto flex max-w-[1760px] flex-wrap items-center gap-2 px-4 py-2 xl:flex-nowrap xl:gap-5 xl:px-6">
          <a href="/" className="shrink-0" aria-label="Ondetemm — início">
            <img
              src={brandLogo}
              alt="Ondetemm — O guia completo para encontrar tudo"
              className="h-12 w-44 scale-125 object-contain sm:w-48"
            />
          </a>
          {!isHome && (
            <form
              action="/"
              role="search"
              className="relative order-3 w-full xl:order-none xl:min-w-40 xl:flex-1 xl:max-w-sm"
            >
              <label htmlFor="navbar-search" className="sr-only">
                Pesquisar empresas
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="navbar-search"
                name="q"
                type="search"
                placeholder="O que você procura?"
                className={
                  inputClass.replace("min-h-11", "min-h-10") + " bg-card pl-10 pr-14 shadow-sm"
                }
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-2 text-sm font-semibold text-brand"
                aria-label="Buscar empresas"
              >
                Ir
              </button>
            </form>
          )}
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 whitespace-nowrap text-sm md:order-4 md:flex md:w-full md:overflow-x-auto xl:order-none xl:ml-auto xl:w-auto"
          >
            <a
              href="/"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 font-medium text-foreground/80 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <Home aria-hidden="true" className="h-4 w-4" />
              Início
            </a>
            <a
              href="/#categorias"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 font-medium text-foreground/80 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
              Categorias
            </a>
            <a
              href="/#para-empresas"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 font-medium text-foreground/80 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              <Store aria-hidden="true" className="h-4 w-4" />
              Para empresas
            </a>
          </nav>
          <div className="ml-auto hidden max-w-full flex-wrap items-center gap-2.5 whitespace-nowrap text-sm md:flex xl:ml-0 xl:flex-nowrap">
            <a
              href="/empresas/nova"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-orange to-amber-500 px-4 py-2 font-semibold text-brand-orange-foreground shadow-sm shadow-brand-orange/25 transition hover:shadow-md hover:shadow-brand-orange/40"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Cadastrar empresa
            </a>
            {auth.user ? (
              <>
                {auth.user.role === "ADMIN" && auth.user.email === ADMIN_EMAIL && (
                  <a
                    href="/admin"
                    className="rounded-full px-3 py-2 font-semibold text-brand transition-colors hover:bg-brand-soft"
                  >
                    Administração
                  </a>
                )}
                <a
                  href="/painel"
                  className="rounded-full px-3 py-2 font-semibold text-brand transition-colors hover:bg-brand-soft"
                >
                  Minhas empresas
                </a>
                <button
                  aria-label="Sair da conta"
                  disabled={leaving}
                  onClick={async () => {
                    setLeaving(true);
                    try {
                      await auth.logout();
                    } catch {
                      /* Local session was cleared. */
                    } finally {
                      setLeaving(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-2 transition-colors hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  {leaving ? "Saindo…" : "Sair"}
                </button>
              </>
            ) : (
              <a
                href="/entrar"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand/40 px-4 py-2 font-semibold text-brand transition-colors hover:bg-brand-soft"
              >
                <UserRound aria-hidden="true" className="h-4 w-4" />
                Entrar
              </a>
            )}
          </div>
        </div>
      </header>
      <main id="conteudo" className="pb-24 md:pb-0">
        {children}
      </main>
      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[92%] max-w-sm items-center justify-between rounded-full border border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur-sm md:hidden"
      >
        <a
          href="/"
          aria-label="Início"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-muted-foreground hover:text-brand"
        >
          <Home aria-hidden="true" className="h-5 w-5" />
          <span className="text-[10px] font-medium">Início</span>
        </a>
        <a
          href="/#categorias"
          aria-label="Categorias"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-muted-foreground hover:text-brand"
        >
          <LayoutGrid aria-hidden="true" className="h-5 w-5" />
          <span className="text-[10px] font-medium">Categorias</span>
        </a>
        <a
          href="/empresas/nova"
          aria-label="Cadastrar empresa"
          className="mx-1 -mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-amber-500 text-brand-orange-foreground shadow-lg shadow-brand-orange/30 ring-4 ring-background transition hover:opacity-90"
        >
          <Plus aria-hidden="true" className="h-6 w-6" />
        </a>
        <button
          type="button"
          aria-label="Buscar empresas"
          onClick={() => document.getElementById(isHome ? "hero-search" : "navbar-search")?.focus()}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-muted-foreground hover:text-brand"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
          <span className="text-[10px] font-medium">Buscar</span>
        </button>
        <a
          href={auth.user ? "/painel" : "/entrar"}
          aria-label={auth.user ? "Minhas empresas" : "Entrar"}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-muted-foreground hover:text-brand"
        >
          <UserRound aria-hidden="true" className="h-5 w-5" />
          <span className="text-[10px] font-medium">{auth.user ? "Perfil" : "Entrar"}</span>
        </a>
      </nav>
      <footer className="mt-4 border-t border-border bg-card pb-24 md:pb-0">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="/" aria-label="Ondetemm — início">
              <img src={brandLogo} alt="Ondetemm" className="h-20 w-48 object-contain" />
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Comércio e serviços mais perto de você.
            </p>
          </div>
          {[
            {
              title: "Explore a cidade",
              items: [
                ["Categorias", "/#categorias"],
                ["Empresas", "/#resultados"],
                ["Promoções", "/#promocoes"],
              ],
            },
            {
              title: "Para empresas",
              items: [
                ["Cadastrar empresa", "/empresas/nova"],
                ["Minhas empresas", "/painel"],
                ["Criar conta", "/cadastrar"],
              ],
            },
            {
              title: "Sua conta",
              items: [
                ["Entrar", "/entrar"],
                ["Recuperar senha", "/recuperar-senha"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold">{col.title}</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {col.items.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-brand">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-[11px] text-muted-foreground">
            <p>© {new Date().getFullYear()} Ondetemm. Todos os direitos reservados.</p>
            <p>Feito com ♥ para Santa Inês - MA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
export function RequireAccount({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <PageLoading text="Verificando sua sessão" />;
  if (!auth.user)
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border p-8 text-center">
        <h1 className="text-2xl font-bold">Entre para continuar</h1>
        <p className="my-4 text-muted-foreground">
          Acesse sua conta para cadastrar e gerenciar suas empresas.
        </p>
        {auth.error && <ErrorNotice onRetry={() => void auth.reload()}>{auth.error}</ErrorNotice>}
        <div className="flex justify-center gap-3">
          <a href="/entrar" className={buttonClass}>
            Entrar
          </a>
          <a href="/cadastrar" className="px-4 py-3 text-sm font-semibold text-brand">
            Criar conta
          </a>
        </div>
      </div>
    );
  return <>{children}</>;
}
