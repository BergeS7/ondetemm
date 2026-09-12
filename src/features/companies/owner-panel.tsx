import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Plus,
  Store,
  Send,
  SquarePen,
  Star,
  ImagePlus,
  Tag,
  CircleCheck,
  LayoutDashboard,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  Eye,
  MessageCircle,
  MousePointerClick,
  Crown,
  CheckCircle2,
  ExternalLink,
  Mail,
  UserRound,
  KeyRound,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import brandLogo from "@/assets/ondetemm-logo-v2.png";
import {
  api,
  message,
  type Page as ApiPage,
  type Company,
  type Plan,
  type Subscription,
  type AnalyticsSummary,
} from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { PageLoading, ErrorNotice, buttonClass } from "@/components/site-shell";
import { CompanyProfilePreview } from "./company-profile-preview";
import { type EditSection } from "./company-profile-view";
import { CompanyForm } from "./company-form";
import { MediaEditor, HoursEditor, ItemsEditor, type ManagedCompany } from "./company-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusLabels: Record<Company["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  ACTIVE: "Publicada",
  REJECTED: "Precisa de ajustes",
  SUSPENDED: "Suspensa",
};
const statusTone: Record<Company["status"], string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL: "bg-warn/15 text-warn",
  ACTIVE: "bg-whats/10 text-whats",
  REJECTED: "bg-danger/10 text-danger",
  SUSPENDED: "bg-danger/10 text-danger",
};
const subLabels: Record<Subscription["status"], string> = {
  PENDING: "Pagamento pendente",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento atrasado",
  CANCELED: "Cancelada",
};
const subTone: Record<Subscription["status"], string> = {
  PENDING: "bg-warn/15 text-warn",
  ACTIVE: "bg-whats/10 text-whats",
  PAST_DUE: "bg-danger/10 text-danger",
  CANCELED: "bg-muted text-muted-foreground",
};
const cardClass = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const QUOTES = [
  "Valorizar o comércio local é fortalecer o que é nosso.",
  "Cada visita ao seu perfil é uma nova chance de virar cliente.",
  "Um perfil completo é a vitrine que nunca fecha.",
  "Quem é encontrado, é escolhido.",
];

export type Tab = "dashboard" | "perfil" | "pagamentos" | "notificacoes" | "config";
const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "perfil", label: "Perfil da empresa", icon: Store },
  { key: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { key: "notificacoes", label: "Notificações", icon: Bell },
  { key: "config", label: "Configurações", icon: Settings },
];

function useMyCompanies() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["private", auth.user?.id, "companies-all"],
    queryFn: ({ signal }) =>
      api.request<ApiPage<Company>>("/me/companies?page=1&limit=50", {
        authenticated: true,
        signal,
      }),
    enabled: !!auth.user,
  });
}
function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: ({ signal }) => api.request<ApiPage<Plan>>("/plans?limit=10", { signal }),
  });
}
function useSubscriptions(companyId: string) {
  return useQuery({
    queryKey: ["private", companyId, "subscriptions"],
    queryFn: ({ signal }) =>
      api.request<ApiPage<Subscription>>(`/companies/${companyId}/subscriptions?limit=5`, {
        authenticated: true,
        signal,
      }),
    enabled: !!companyId,
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Eye;
  tone: "brand" | "teal" | "whats" | "orange";
}) {
  const tones = {
    brand: "bg-brand/10 text-brand",
    teal: "bg-brand-teal/10 text-brand-teal",
    whats: "bg-whats/10 text-whats",
    orange: "bg-brand-orange/10 text-brand-orange",
  };
  return (
    <div className={cardClass}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardTab({
  company,
  onNavigate,
  onEdit,
}: {
  company: Company | undefined;
  onNavigate: (tab: Tab) => void;
  onEdit: (section: EditSection) => void;
}) {
  const auth = useAuth();
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const companyId = company?.id ?? "";
  const analytics = useQuery({
    queryKey: ["private", companyId, "analytics", period],
    queryFn: ({ signal }) =>
      api.request<AnalyticsSummary>(`/companies/${companyId}/analytics?period=${period}`, {
        authenticated: true,
        signal,
      }),
    enabled: !!companyId,
  });
  const plans = usePlans();
  const subscriptions = useSubscriptions(companyId);
  const live = subscriptions.data?.data.find((s) => s.status !== "CANCELED");
  const currentPlan = live
    ? plans.data?.data.find((p) => p.id === live.plan_id)
    : plans.data?.data.find((p) => p.code === "FREE");
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const seriesData = useMemo(
    () =>
      [...(analytics.data?.series ?? [])]
        .map((d) => ({ date: String(d["date"]), views: Number(d["profileViews"] ?? 0) }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          ...d,
          label: new Date(`${d.date}T00:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
        })),
    [analytics.data],
  );
  const channels = useMemo(() => {
    const a = analytics.data;
    if (!a) return [];
    return [
      { name: "WhatsApp", value: a.whatsappClicks, color: "var(--whats)" },
      { name: "Telefone", value: a.phoneClicks, color: "var(--brand)" },
      { name: "Instagram", value: a.instagramClicks, color: "var(--brand-orange)" },
      { name: "Rota", value: a.routeClicks, color: "var(--brand-teal)" },
      { name: "Site", value: a.websiteClicks, color: "var(--muted-foreground)" },
    ].filter((c) => c.value > 0);
  }, [analytics.data]);
  const channelTotal = channels.reduce((s, c) => s + c.value, 0);
  if (!company)
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Store className="mx-auto mb-4 h-10 w-10 text-brand" />
        <h2 className="text-xl font-bold">Cadastre sua empresa para ver o dashboard</h2>
        <p className="mx-auto my-3 max-w-md text-sm text-muted-foreground">
          Assim que sua empresa for cadastrada, as métricas de visualizações e contatos aparecem
          aqui.
        </p>
        <a href="/empresas/nova" className={`${buttonClass} mt-3`}>
          Cadastrar minha empresa
        </a>
      </div>
    );
  const rating = Number(company?.average_rating) || 0,
    reviews = company?.reviews_count ?? 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Olá, {auth.user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui você acompanha o desempenho do seu negócio no Ondetemm.
          </p>
        </div>
        <blockquote className="max-w-sm rounded-2xl bg-brand-soft p-4 text-sm italic text-brand">
          “{quote}”
          <footer className="mt-1 text-right text-xs font-semibold not-italic text-brand/70">
            — Ondetemm
          </footer>
        </blockquote>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-xs font-semibold">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1.5 transition-colors ${period === p ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
            </button>
          ))}
        </div>
      </div>
      {company?.status !== "ACTIVE" && (
        <p className="rounded-lg bg-brand-soft p-4 text-sm text-brand">
          As métricas ficam completas assim que a empresa é publicada. Status atual:{" "}
          {company && statusLabels[company.status]}.
        </p>
      )}
      {analytics.error ? (
        <ErrorNotice onRetry={() => void analytics.refetch()}>
          {message(analytics.error)}
        </ErrorNotice>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Visualizações do perfil"
            value={
              analytics.isPending
                ? "…"
                : (analytics.data?.profileViews ?? 0).toLocaleString("pt-BR")
            }
            icon={Eye}
            tone="brand"
          />
          <StatCard
            label="Cliques recebidos"
            value={analytics.isPending ? "…" : channelTotal.toLocaleString("pt-BR")}
            icon={MousePointerClick}
            tone="teal"
          />
          <StatCard
            label="Contatos diretos"
            value={
              analytics.isPending
                ? "…"
                : (
                    (analytics.data?.whatsappClicks ?? 0) + (analytics.data?.phoneClicks ?? 0)
                  ).toLocaleString("pt-BR")
            }
            icon={MessageCircle}
            tone="whats"
          />
          <StatCard
            label={`Avaliação média (${reviews})`}
            value={reviews > 0 ? rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "—"}
            icon={Star}
            tone="orange"
          />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className={cardClass}>
            <h3 className="font-bold">Visualizações no período</h3>
            {seriesData.some((d) => d.views > 0) ? (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesData} margin={{ left: -20, right: 8 }}>
                    <defs>
                      <linearGradient id="views-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      minTickGap={24}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                      labelFormatter={(l) => `Dia ${l}`}
                      formatter={(v: number) => [v, "Visualizações"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="var(--brand)"
                      strokeWidth={2}
                      fill="url(#views-gradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-6 py-10 text-center text-sm text-muted-foreground">
                Ainda não há visualizações suficientes neste período.
              </p>
            )}
          </div>
          <div className={cardClass}>
            <h3 className="font-bold">Origem dos contatos</h3>
            {channels.length ? (
              <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channels}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {channels.map((c) => (
                          <Cell key={c.name} fill={c.color} stroke="var(--card)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {channels.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="font-semibold">
                        {Math.round((c.value / channelTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-6 py-10 text-center text-sm text-muted-foreground">
                Ainda não há cliques de contato neste período.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Meu plano</h3>
              {currentPlan?.code === "PREMIUM" && <Crown className="h-4 w-4 text-brand-orange" />}
            </div>
            <p className="mt-2 text-lg font-bold">{currentPlan?.name ?? "Gratuito"}</p>
            <p className="text-sm text-muted-foreground">{currentPlan?.description}</p>
            <button
              onClick={() => onNavigate("pagamentos")}
              className={`${buttonClass} mt-4 w-full`}
            >
              Ver planos
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {company && (
            <div className={cardClass}>
              <h3 className="mb-3 font-bold">Ações rápidas</h3>
              <ul className="space-y-1">
                {(
                  [
                    { label: "Editar meu perfil", icon: SquarePen, section: "dados" },
                    { label: "Trocar fotos", icon: ImagePlus, section: "fotos" },
                    { label: "Criar promoção", icon: Tag, section: "promocoes" },
                  ] as const
                ).map((a) => (
                  <li key={a.label}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("perfil");
                        onEdit(a.section);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <span className="flex items-center gap-2.5">
                        <a.icon className="h-4 w-4 text-brand" />
                        {a.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={cardClass}>
            <h3 className="font-bold">Avaliações</h3>
            <p className="mt-3 text-3xl font-bold">{reviews > 0 ? rating.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground">{reviews} avaliações recebidas</p>
            <p className="mt-3 text-xs text-muted-foreground">
              A lista detalhada de avaliações chega em breve por aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerfilTab({
  company,
  editSection,
  onEditSection,
}: {
  company: Company | undefined;
  editSection: EditSection | null;
  onEditSection: (section: EditSection | null) => void;
}) {
  const auth = useAuth(),
    cache = useQueryClient();
  const [notice, setNotice] = useState("");
  const submit = useMutation({
    mutationFn: (id: string) =>
      api.request(`/companies/${id}/submit`, { method: "POST", authenticated: true }),
    onSuccess: async () => {
      setNotice("Empresa enviada! A publicação acontecerá após a aprovação da administração.");
      await cache.invalidateQueries({ queryKey: ["private", auth.user?.id] });
    },
  });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Perfil da empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            É exatamente assim que sua empresa aparece para quem visita o Ondetemm. Edite tudo
            direto por aqui.
          </p>
        </div>
        {company && company.status !== "SUSPENDED" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={() => onEditSection("dados")}>
              <SquarePen className="h-4 w-4" />
              Editar informações
            </button>
            <button
              type="button"
              onClick={() => onEditSection("fotos")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <ImagePlus className="h-4 w-4" />
              Adicionar foto
            </button>
            <button
              type="button"
              onClick={() => onEditSection("promocoes")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <Tag className="h-4 w-4" />
              Criar promoção
            </button>
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="mb-5 rounded-lg bg-brand-soft p-4 text-sm text-brand">
          {notice}
        </p>
      )}
      {submit.error && <ErrorNotice>{message(submit.error)}</ErrorNotice>}
      {!company ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-brand" />
          <h2 className="text-xl font-bold">Seu negócio começa aqui</h2>
          <p className="mx-auto my-3 max-w-md text-sm text-muted-foreground">
            Você ainda não cadastrou uma empresa. Crie seu perfil e envie para aprovação.
          </p>
          <a href="/empresas/nova" className={`${buttonClass} mt-3`}>
            <Plus className="h-4 w-4" />
            Cadastrar minha empresa
          </a>
        </div>
      ) : (
        <>
          {company.status !== "SUSPENDED" && (
            <div
              className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${statusTone[company.status]}`}
            >
              <span className="font-semibold">
                Status do perfil: {statusLabels[company.status]}
                {company.rejection_reason && ` — ${company.rejection_reason}`}
              </span>
              {(company.status === "DRAFT" || company.status === "REJECTED") && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5 font-semibold hover:bg-white disabled:opacity-50"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate(company.id)}
                >
                  <Send className="h-4 w-4" />
                  {submit.isPending ? "Enviando…" : "Enviar para aprovação"}
                </button>
              )}
            </div>
          )}
          {company.status === "SUSPENDED" ? (
            <ErrorNotice>
              Empresa suspensa. Entre em contato com a administração para solicitar uma revisão.
            </ErrorNotice>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <CompanyProfilePreview company={company} onEdit={onEditSection} />
            </div>
          )}
          <EditCompanyDialog
            company={company}
            section={editSection}
            onClose={() => onEditSection(null)}
          />
        </>
      )}
    </div>
  );
}
const sectionTitles: Record<EditSection, string> = {
  dados: "Editar informações",
  fotos: "Logo, capa e galeria",
  horarios: "Horários de funcionamento",
  servicos: "Serviços",
  promocoes: "Promoções",
};
function EditCompanyDialog({
  company,
  section,
  onClose,
}: {
  company: Company;
  section: EditSection | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{section && sectionTitles[section]}</DialogTitle>
        </DialogHeader>
        {section === "dados" && <CompanyForm initial={company} onSaved={onClose} />}
        {section === "fotos" && <MediaEditor id={company.id} company={company as ManagedCompany} />}
        {section === "horarios" && <HoursEditor id={company.id} />}
        {section === "servicos" && <ItemsEditor id={company.id} kind="services" />}
        {section === "promocoes" && <ItemsEditor id={company.id} kind="promotions" />}
      </DialogContent>
    </Dialog>
  );
}

const planPitch: Record<Plan["code"], string> = {
  FREE: "Perfil básico para começar",
  FEATURED: "Mais visibilidade e métricas",
  PREMIUM: "Destaque máximo no Ondetemm",
};
function planFeatures(p: Plan) {
  const l = p.limits as Record<string, unknown>;
  const num = (k: string) => (typeof l[k] === "number" ? (l[k] as number) : Number(l[k] ?? 0));
  const items: string[] = [];
  const categories = num("categories");
  if (categories > 0) items.push(`${categories} ${categories === 1 ? "categoria" : "categorias"}`);
  const photos = num("photos");
  if (photos > 0) items.push(`Até ${photos} fotos na galeria`);
  const services = num("services");
  if (services > 0) items.push(`${services} serviços cadastrados`);
  const promotions = num("promotions");
  if (promotions > 0) items.push(`${promotions} promoções simultâneas`);
  const analyticsDays = num("analytics_days");
  if (analyticsDays > 0) items.push(`Métricas dos últimos ${analyticsDays} dias`);
  if (l["home_featured"]) items.push("Destaque na página inicial");
  return items;
}
function PlanCard({
  plan,
  isCurrent,
  disabled,
  subscribing,
  onSubscribe,
}: {
  plan: Plan;
  isCurrent: boolean;
  disabled: boolean;
  subscribing: boolean;
  onSubscribe: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const features = planFeatures(plan);
  const highlighted = expanded ? features : features.slice(0, 4);
  const isNew = plan.code === "PREMIUM";
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6 ${isNew ? "border-brand-orange/50 ring-1 ring-brand-orange/20" : "border-border"}`}
    >
      {isNew && (
        <span className="absolute right-0 top-0 rounded-bl-xl bg-brand-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-orange-foreground">
          Novidade!
        </span>
      )}
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">
        {plan.code === "PREMIUM" && <Crown className="h-3 w-3" />}
        Plano Ondetemm
      </span>
      <p className="mt-2.5 text-sm font-semibold text-brand-teal">{planPitch[plan.code]}</p>
      <h3 className="mt-1 text-xl font-bold">{plan.name}</h3>
      <ul className="mt-4 space-y-2">
        {highlighted.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
            {f}
          </li>
        ))}
      </ul>
      {features.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 self-start text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "Ver menos" : "Mais detalhes"}
        </button>
      )}
      <p className="mt-5 text-3xl font-bold">
        {Number(plan.price_monthly) === 0 ? "Grátis" : money(plan.price_monthly)}
        {Number(plan.price_monthly) > 0 && (
          <span className="text-sm font-normal text-muted-foreground">/mês</span>
        )}
      </p>
      <div className="mt-4">
        {isCurrent ? (
          <span className="flex items-center justify-center gap-1.5 rounded-full bg-whats/10 py-2.5 text-sm font-semibold text-whats">
            <CheckCircle2 className="h-4 w-4" />
            Plano atual
          </span>
        ) : plan.code === "FREE" ? (
          <span className="block py-2.5 text-center text-sm text-muted-foreground">
            Plano inicial
          </span>
        ) : (
          <button
            className={`${buttonClass} w-full rounded-full`}
            disabled={subscribing || disabled}
            onClick={onSubscribe}
          >
            {subscribing ? "Redirecionando…" : "Assine já"}
          </button>
        )}
      </div>
    </div>
  );
}
function PagamentosTab({ company }: { company: Company | undefined }) {
  const cache = useQueryClient();
  const companyId = company?.id ?? "";
  const plans = usePlans();
  const subscriptions = useSubscriptions(companyId);
  const subscribe = useMutation({
    mutationFn: (plan_code: string) =>
      api.request<Subscription>(`/companies/${companyId}/subscriptions`, {
        method: "POST",
        authenticated: true,
        body: { plan_code },
      }),
    onSuccess: async (sub) => {
      if (sub.checkout_url) window.open(sub.checkout_url, "_blank", "noopener");
      await cache.invalidateQueries({ queryKey: ["private", companyId, "subscriptions"] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api.request(`/subscriptions/${id}/cancel`, { method: "POST", authenticated: true }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["private", companyId, "subscriptions"] }),
  });
  if (plans.isPending) return <PageLoading text="Carregando planos" />;
  if (!company)
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <CreditCard className="mx-auto mb-4 h-10 w-10 text-brand" />
        <h2 className="text-xl font-bold">Cadastre sua empresa para ver planos</h2>
        <p className="mx-auto my-3 max-w-md text-sm text-muted-foreground">
          Depois de cadastrar sua empresa você poderá contratar planos pagos aqui.
        </p>
      </div>
    );
  const live = subscriptions.data?.data.find((s) => s.status !== "CANCELED");
  const plan = live && plans.data?.data.find((p) => p.id === live.plan_id);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Pagamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Planos, contratações e cobranças da sua empresa.
        </p>
      </div>
      {subscribe.error && <ErrorNotice>{message(subscribe.error)}</ErrorNotice>}
      {cancel.error && <ErrorNotice>{message(cancel.error)}</ErrorNotice>}
      {live && (
        <div className={`${cardClass} mb-6 flex flex-wrap items-center justify-between gap-4`}>
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${subTone[live.status]}`}
            >
              {subLabels[live.status]}
            </span>
            <p className="mt-2 text-lg font-bold">{plan?.name ?? "Plano contratado"}</p>
            <p className="text-sm text-muted-foreground">{money(live.amount)}/mês</p>
            {live.current_period_end && (
              <p className="mt-1 text-xs text-muted-foreground">
                Renova em {new Date(live.current_period_end).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          {live.status !== "CANCELED" && (
            <button
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(live.id)}
            >
              {cancel.isPending ? "Cancelando…" : "Cancelar plano"}
            </button>
          )}
          {live.status === "PENDING" && live.checkout_url && (
            <a href={live.checkout_url} target="_blank" rel="noopener" className={buttonClass}>
              <ExternalLink className="h-4 w-4" />
              Concluir pagamento
            </a>
          )}
        </div>
      )}
      {company?.status !== "ACTIVE" ? (
        <p className="rounded-lg bg-brand-soft p-4 text-sm text-brand">
          Planos pagos ficam disponíveis assim que a empresa é publicada.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3">
          {plans.data?.data.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={plan?.id === p.id && live?.status !== "CANCELED"}
              disabled={!!live}
              subscribing={subscribe.isPending}
              onSubscribe={() => subscribe.mutate(p.code)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificacoesTab() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Notificações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Avisos sobre sua empresa e sua conta.</p>
      </div>
      <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <Bell className="mx-auto mb-4 h-10 w-10 text-brand" />
        <h2 className="text-xl font-bold">Em breve</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Estamos preparando avisos automáticos sobre aprovação de empresa, novas avaliações e
          cobranças. Por enquanto, acompanhe essas atualizações em cada aba do painel.
        </p>
      </div>
    </div>
  );
}

function ConfiguracoesTab() {
  const auth = useAuth();
  const [leaving, setLeaving] = useState(false);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados da sua conta de acesso.</p>
      </div>
      <div className={`${cardClass} max-w-lg`}>
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <UserRound className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-bold">{auth.user?.name}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {auth.user?.email}
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3 border-t border-border pt-5">
          <a
            href="/recuperar-senha"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </a>
          <button
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              try {
                await auth.logout();
              } finally {
                setLeaving(false);
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
          >
            <LogOut className="h-4 w-4" />
            {leaving ? "Saindo…" : "Sair da conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoggedOutGate() {
  const auth = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <img src={brandLogo} alt="Ondetemm" className="mx-auto h-14 w-auto object-contain" />
        <h1 className="mt-6 text-2xl font-bold">Entre para continuar</h1>
        <p className="my-3 text-sm text-muted-foreground">
          Acesse sua conta para cadastrar e gerenciar sua empresa no Ondetemm.
        </p>
        {auth.error && <ErrorNotice onRetry={() => void auth.reload()}>{auth.error}</ErrorNotice>}
        <div className="mt-4 flex justify-center gap-3">
          <a href="/entrar" className={buttonClass}>
            Entrar
          </a>
          <a href="/cadastrar" className="px-4 py-3 text-sm font-semibold text-brand">
            Criar conta
          </a>
        </div>
        <a
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao site
        </a>
      </div>
    </div>
  );
}

export function PanelChrome({
  active,
  onSelectTab,
  children,
}: {
  active: Tab;
  onSelectTab?: (tab: Tab) => void;
  children: ReactNode;
}) {
  const auth = useAuth();
  const companies = useMyCompanies();
  const company = companies.data?.data[0];
  const initial = auth.user?.name?.[0]?.toUpperCase() ?? "?";
  const go = (tab: Tab) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab(tab);
      window.history.replaceState(null, "", `/painel#${tab}`);
    }
  };
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <a href="/" className="flex items-center gap-2 px-6 py-6">
          <img src={brandLogo} alt="Ondetemm" className="h-10 w-auto object-contain" />
        </a>
        <nav aria-label="Navegação do painel" className="flex-1 space-y-1 px-4">
          {NAV.map((n) => (
            <a
              key={n.key}
              href={`/painel#${n.key}`}
              onClick={go(n.key)}
              aria-current={active === n.key ? "page" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                active === n.key
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mx-4 mb-6 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4 text-xs leading-relaxed text-sidebar-muted">
          Ondetemm — o guia completo para encontrar tudo perto de você.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <img src={brandLogo} alt="Ondetemm" className="h-8 w-auto object-contain lg:hidden" />
          <a
            href="/"
            className="hidden items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand lg:flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </a>
          <div className="ml-auto flex items-center gap-3">
            <a
              aria-label="Notificações"
              href="/painel#notificacoes"
              onClick={go("notificacoes")}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
            >
              <Bell className="h-4 w-4" />
            </a>
            <a
              href="/painel#config"
              onClick={go("config")}
              className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 transition-colors hover:bg-muted"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {initial}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight">{auth.user?.name}</span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {company?.name ?? "Minha conta"}
                </span>
              </span>
            </a>
          </div>
        </header>
        <nav
          aria-label="Navegação do painel"
          className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-card px-4 py-2 lg:hidden"
        >
          {NAV.map((n) => (
            <a
              key={n.key}
              href={`/painel#${n.key}`}
              onClick={go(n.key)}
              aria-current={active === n.key ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${active === n.key ? "border-brand bg-brand text-brand-foreground" : "border-border text-foreground/80"}`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </a>
          ))}
        </nav>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function PanelShell() {
  const [tab, setTab] = useState<Tab>(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    return NAV.some((n) => n.key === fromHash) ? fromHash : "dashboard";
  });
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const companies = useMyCompanies();
  const company = companies.data?.data[0];
  const openEditor = (section: EditSection) => {
    setTab("perfil");
    setEditSection(section);
  };
  return (
    <PanelChrome active={tab} onSelectTab={setTab}>
      {companies.isPending ? (
        <PageLoading text="Carregando painel" />
      ) : companies.error ? (
        <ErrorNotice onRetry={() => void companies.refetch()}>
          {message(companies.error)}
        </ErrorNotice>
      ) : (
        <>
          {tab === "dashboard" && (
            <DashboardTab company={company} onNavigate={setTab} onEdit={openEditor} />
          )}
          {tab === "perfil" && (
            <PerfilTab company={company} editSection={editSection} onEditSection={setEditSection} />
          )}
          {tab === "pagamentos" && <PagamentosTab company={company} />}
          {tab === "notificacoes" && <NotificacoesTab />}
          {tab === "config" && <ConfiguracoesTab />}
        </>
      )}
    </PanelChrome>
  );
}

export function OwnerPanel() {
  const auth = useAuth();
  if (!auth.ready) return <PageLoading text="Verificando sua sessão" />;
  if (!auth.user) return <LoggedOutGate />;
  return <PanelShell />;
}
