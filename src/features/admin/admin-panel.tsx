import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, message, type Page, type Company, type User } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import {
  RequireAccount,
  Loading,
  ErrorNotice,
  buttonClass,
  inputClass,
} from "@/components/site-shell";
import { CompanyForm } from "@/features/companies/company-form";

export function AdminAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <RequireAccount>
      {user?.role === "ADMIN" ? (
        children
      ) : (
        <div role="alert" className="rounded-xl border p-8">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-3">Esta área é exclusiva para administradores.</p>
          <a href="/painel" className="mt-4 inline-block text-brand">
            Voltar para minhas empresas
          </a>
        </div>
      )}
    </RequireAccount>
  );
}
type Tab = "companies" | "claims" | "users" | "analytics";
type Action = {
  path: string;
  name: string;
  kind: "approve" | "reject" | "suspend";
  user?: boolean;
};
type Profile = User & { status: string };
type Metric = { company_id: string; event_type: string; count: number };
type Claim = {
  id: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  claimant_name: string;
  claimant_email: string;
  message: string | null;
  status: string;
  rejection_reason: string | null;
};
const statuses = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  ACTIVE: "Publicada",
  REJECTED: "Rejeitada",
  SUSPENDED: "Suspensa",
};
const events: Record<string, string> = {
  PROFILE_VIEW: "Visitas ao perfil",
  WHATSAPP_CLICK: "Cliques no WhatsApp",
  PHONE_CLICK: "Cliques no telefone",
};
export function AdminPanel() {
  const { user } = useAuth(),
    cache = useQueryClient();
  const [tab, setTab] = useState<Tab>("companies"),
    [page, setPage] = useState(1),
    [status, setStatus] = useState("PENDING_APPROVAL");
  const [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false);
  const key = ["private", user?.id, "admin"];
  const dashboard = useQuery({
    queryKey: [...key, "dashboard"],
    queryFn: ({ signal }) =>
      api.request<{
        companies: number;
        pending: number;
        users: number;
        active_subscriptions: number;
      }>("/admin/dashboard", { authenticated: true, signal }),
  });
  const endpoint = tab === "claims" ? "company-claims" : tab;
  const rows = useQuery({
    queryKey: [...key, tab, page, status],
    queryFn: ({ signal }) =>
      api.request<Page<Company | Profile | Metric | Claim>>(
        `/admin/${endpoint}?page=${page}&limit=10${tab === "companies" && status ? `&status=${status}` : ""}${tab === "claims" ? "&status=PENDING" : ""}`,
        { authenticated: true, signal },
      ),
  });
  const mutation = useMutation({
    mutationFn: ({ target, reason: why }: { target: Action; reason: string }) =>
      api.request(target.path, {
        method: "POST",
        authenticated: true,
        ...(target.kind === "reject" || target.user ? { body: { reason: why.trim() } } : {}),
      }),
    onSuccess: async () => {
      setAction(null);
      setReason("");
      setNotice("Alteração concluída com sucesso.");
      await Promise.all([
        cache.invalidateQueries({ queryKey: key }),
        cache.invalidateQueries({ queryKey: ["search"] }),
        cache.invalidateQueries({ queryKey: ["public-company"] }),
      ]);
    },
  });
  function choose(target: Action) {
    mutation.reset();
    setNotice("");
    setReason("");
    setAction(target);
  }
  const needsReason = action?.kind === "reject" || action?.user;
  return (
    <>
      <div className="mb-8">
        <p className="text-sm text-brand">Administração</p>
        <h1 className="text-3xl font-bold">Painel administrativo</h1>
        <p className="mt-2 text-muted-foreground">
          Revise cadastros e acompanhe a atividade do Onde Tem.
        </p>
      </div>
      {dashboard.isPending ? (
        <Loading />
      ) : dashboard.error ? (
        <ErrorNotice onRetry={() => void dashboard.refetch()}>
          {message(dashboard.error)}
        </ErrorNotice>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Empresas", dashboard.data.companies],
            ["Aguardando aprovação", dashboard.data.pending],
            ["Usuários", dashboard.data.users],
            ["Assinaturas ativas", dashboard.data.active_subscriptions],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}
      <nav aria-label="Seções administrativas" className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["companies", "Empresas"],
            ["claims", "Reivindicações de empresas"],
            ["users", "Usuários"],
            ["analytics", "Métricas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={tab === value ? buttonClass : "rounded-lg border px-5 py-2 text-sm"}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-brand-soft p-4">
          {notice}
        </p>
      )}
      {tab === "companies" && (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <label className="block max-w-sm text-sm font-medium">
              Situação da empresa
              <select
                className={inputClass + " mt-2"}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {Object.entries(statuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className={buttonClass} onClick={() => setCreating((v) => !v)}>
              {creating ? "Cancelar" : "Criar empresa"}
            </button>
          </div>
          {creating && (
            <div className="mb-8">
              <p className="mb-3 text-sm text-muted-foreground">
                A empresa é publicada sem proprietário e fica disponível para reivindicação pelo
                responsável do negócio.
              </p>
              <CompanyForm
                mode="admin"
                onSaved={() => {
                  setCreating(false);
                  setNotice("Empresa criada e publicada. Ela já pode ser reivindicada.");
                  void cache.invalidateQueries({ queryKey: key });
                }}
              />
            </div>
          )}
        </>
      )}
      {tab === "analytics" && (
        <p className="mb-4 text-sm text-muted-foreground">
          Interações registradas nos últimos 30 dias, agrupadas por empresa. Os identificadores
          permitem relacionar os dados aos cadastros.
        </p>
      )}
      {rows.isPending ? (
        <Loading text="Carregando registros…" />
      ) : rows.error ? (
        <ErrorNotice onRetry={() => void rows.refetch()}>{message(rows.error)}</ErrorNotice>
      ) : (
        <>
          {rows.data.data.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center">
              Nenhum registro encontrado.
            </p>
          ) : (
            <div className="space-y-4">
              {rows.data.data.map((row) => {
                if (tab === "companies") {
                  const c = row as Company;
                  return (
                    <article key={c.id} className="rounded-xl border border-border p-5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <h2 className="text-lg font-bold">{c.name}</h2>
                        <span className="text-sm text-brand">{statuses[c.status]}</span>
                      </div>
                      <p className="my-3 whitespace-pre-wrap text-sm">
                        {c.description || c.short_description}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">ID: {c.id}</p>
                      <p className="mt-2 text-sm">
                        {[c.street, c.number, c.neighborhood].filter(Boolean).join(", ") ||
                          "Endereço não informado"}
                      </p>
                      <p className="text-sm">WhatsApp: {c.whatsapp || "Não informado"}</p>
                      {c.rejection_reason && (
                        <p className="mt-3 text-sm text-danger">Motivo: {c.rejection_reason}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {c.status === "PENDING_APPROVAL" && (
                          <>
                            <button
                              className={buttonClass}
                              onClick={() =>
                                choose({
                                  path: `/admin/companies/${c.id}/approve`,
                                  name: c.name,
                                  kind: "approve",
                                })
                              }
                            >
                              Aprovar
                            </button>
                            <button
                              className="rounded-lg border px-4 py-2"
                              onClick={() =>
                                choose({
                                  path: `/admin/companies/${c.id}/reject`,
                                  name: c.name,
                                  kind: "reject",
                                })
                              }
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {c.status !== "SUSPENDED" && (
                          <button
                            className="rounded-lg border border-danger/30 px-4 py-2 text-danger"
                            onClick={() =>
                              choose({
                                path: `/admin/companies/${c.id}/suspend`,
                                name: c.name,
                                kind: "suspend",
                              })
                            }
                          >
                            Suspender empresa
                          </button>
                        )}
                      </div>
                    </article>
                  );
                }
                if (tab === "claims") {
                  const cl = row as Claim;
                  return (
                    <article key={cl.id} className="rounded-xl border border-border p-5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <h2 className="text-lg font-bold">{cl.company_name}</h2>
                        <span className="text-sm text-brand">Aguardando análise</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Solicitante: {cl.claimant_name} ({cl.claimant_email})
                      </p>
                      {cl.message && (
                        <p className="my-3 whitespace-pre-wrap text-sm">{cl.message}</p>
                      )}
                      <p className="break-all text-xs text-muted-foreground">
                        Empresa: {cl.company_id}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          className={buttonClass}
                          onClick={() =>
                            choose({
                              path: `/admin/company-claims/${cl.id}/approve`,
                              name: cl.company_name,
                              kind: "approve",
                            })
                          }
                        >
                          Aprovar
                        </button>
                        <button
                          className="rounded-lg border px-4 py-2"
                          onClick={() =>
                            choose({
                              path: `/admin/company-claims/${cl.id}/reject`,
                              name: cl.company_name,
                              kind: "reject",
                            })
                          }
                        >
                          Rejeitar
                        </button>
                      </div>
                    </article>
                  );
                }
                if (tab === "users") {
                  const p = row as Profile;
                  return (
                    <article key={p.id} className="rounded-xl border p-5">
                      <h2 className="font-bold">{p.name}</h2>
                      <p className="break-all text-sm">{p.email}</p>
                      <p className="my-2 text-sm">
                        {p.role === "ADMIN"
                          ? "Administrador"
                          : p.role === "COMPANY_OWNER"
                            ? "Comerciante"
                            : "Usuário"}{" "}
                        · {p.status === "ACTIVE" ? "Ativo" : "Suspenso"}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">ID: {p.id}</p>
                      {p.status === "ACTIVE" && p.id !== user?.id && (
                        <button
                          className="mt-3 rounded-lg border px-4 py-2 text-danger"
                          onClick={() =>
                            choose({
                              path: `/admin/users/${p.id}/suspend`,
                              name: p.name,
                              kind: "suspend",
                              user: true,
                            })
                          }
                        >
                          Suspender usuário
                        </button>
                      )}
                    </article>
                  );
                }
                const m = row as Metric;
                return (
                  <article
                    key={m.company_id + m.event_type}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
                  >
                    <div>
                      <h2 className="font-semibold">{events[m.event_type] || m.event_type}</h2>
                      <p className="break-all text-xs text-muted-foreground">
                        Empresa: {m.company_id}
                      </p>
                    </div>
                    <strong className="text-2xl">{m.count}</strong>
                  </article>
                );
              })}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-3 text-sm">
            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {Math.max(1, rows.data.pagination.totalPages)}
            </span>
            <button
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
              disabled={page >= rows.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
      {action && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-action-title"
        >
          <form
            className="mx-auto my-16 max-w-lg space-y-4 rounded-2xl bg-background p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mutation.isPending) mutation.mutate({ target: action, reason });
            }}
          >
            <h2 id="admin-action-title" className="text-xl font-bold">
              {action.kind === "approve"
                ? "Aprovar cadastro"
                : action.kind === "reject"
                  ? "Rejeitar cadastro"
                  : "Suspender acesso"}
            </h2>
            <p>{action.name}</p>
            <p className="text-sm text-muted-foreground">
              {action.path.includes("company-claims")
                ? action.kind === "approve"
                  ? "O solicitante passará a ser o proprietário desta empresa e poderá gerenciá-la."
                  : "A solicitação será rejeitada e o anúncio continuará sem responsável."
                : action.kind === "approve"
                  ? "A empresa ficará disponível na busca pública."
                  : action.kind === "reject"
                    ? "O responsável receberá o motivo no painel e poderá corrigir o cadastro."
                    : action.user
                      ? "O usuário perderá acesso à conta. A reativação ainda não está disponível neste painel."
                      : "A empresa sairá da busca pública. A reativação ainda não está disponível neste painel."}
            </p>
            {needsReason && (
              <label className="block text-sm">
                Motivo
                <textarea
                  autoFocus
                  required
                  minLength={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass + " mt-2 min-h-24"}
                />
              </label>
            )}
            {mutation.error && <ErrorNotice>{message(mutation.error)}</ErrorNotice>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setAction(null)}
                className="rounded-lg border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                className={buttonClass}
                disabled={mutation.isPending || (!!needsReason && reason.trim().length < 3)}
              >
                {mutation.isPending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
