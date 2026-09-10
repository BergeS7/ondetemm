import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Store, Send, SquarePen } from "lucide-react";
import { api, message, type Page as ApiPage, type Company } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import {
  SiteShell,
  RequireAccount,
  Loading,
  ErrorNotice,
  buttonClass,
} from "@/components/site-shell";
export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Minhas empresas | Onde Tem" }] }),
  component: Page,
});
const labels: Record<Company["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  ACTIVE: "Publicada",
  REJECTED: "Precisa de ajustes",
  SUSPENDED: "Suspensa",
};
function Companies() {
  const auth = useAuth(),
    cache = useQueryClient();
  const [page, setPage] = useState(1),
    [notice, setNotice] = useState("");
  const companies = useQuery({
    queryKey: ["private", auth.user?.id, "companies", page],
    queryFn: ({ signal }) =>
      api.request<ApiPage<Company>>(`/me/companies?page=${page}&limit=10`, {
        authenticated: true,
        signal,
      }),
    enabled: !!auth.user,
  });
  const submit = useMutation({
    mutationFn: (id: string) =>
      api.request(`/companies/${id}/submit`, { method: "POST", authenticated: true }),
    onSuccess: async () => {
      setNotice("Empresa enviada! A publicação acontecerá após a aprovação da administração.");
      await cache.invalidateQueries({ queryKey: ["private", auth.user?.id] });
    },
  });
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {auth.user?.name}</p>
          <h1 className="mt-1 text-3xl font-bold">Minhas empresas</h1>
        </div>
        <a href="/empresas/nova" className={buttonClass}>
          <Plus className="h-4 w-4" />
          Cadastrar empresa
        </a>
      </div>
      {notice && (
        <p role="status" className="mb-5 rounded-lg bg-brand-soft p-4 text-sm text-brand">
          {notice}
        </p>
      )}
      {submit.error && <ErrorNotice>{message(submit.error)}</ErrorNotice>}
      {companies.isPending ? (
        <Loading text="Carregando suas empresas…" />
      ) : companies.error ? (
        <ErrorNotice onRetry={() => void companies.refetch()}>
          {message(companies.error)}
        </ErrorNotice>
      ) : companies.data.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-brand" />
          <h2 className="text-xl font-bold">Seu negócio começa aqui</h2>
          <p className="mx-auto my-3 max-w-md text-sm text-muted-foreground">
            Você ainda não cadastrou uma empresa. Crie seu perfil e envie para aprovação.
          </p>
          <a href="/empresas/nova" className={`${buttonClass} mt-3`}>
            Cadastrar minha primeira empresa
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {companies.data.data.map((c) => (
              <article key={c.id} className="rounded-xl border border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{c.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{c.short_description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${c.status === "ACTIVE" ? "bg-whats/10 text-whats" : "bg-brand-soft text-brand"}`}
                  >
                    {labels[c.status]}
                  </span>
                </div>
                {c.rejection_reason && (
                  <p className="mt-4 rounded-lg bg-danger/5 p-3 text-sm text-danger">
                    Motivo da revisão: {c.rejection_reason}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  {c.status !== "SUSPENDED" && (
                    <a
                      href={`/empresas/${c.id}/editar`}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
                    >
                      <SquarePen className="h-4 w-4" />
                      Editar cadastro
                    </a>
                  )}
                  {(c.status === "DRAFT" || c.status === "REJECTED") && (
                    <button
                      className={buttonClass}
                      disabled={submit.isPending}
                      onClick={() => submit.mutate(c.id)}
                    >
                      <Send className="h-4 w-4" />
                      {submit.isPending ? "Enviando…" : "Enviar para aprovação"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <button
              className="rounded-lg border border-border px-4 py-2 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {companies.data.pagination.totalPages}
            </span>
            <button
              className="rounded-lg border border-border px-4 py-2 disabled:opacity-40"
              disabled={page >= companies.data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </>
  );
}
function Page() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <RequireAccount>
          <Companies />
        </RequireAccount>
      </div>
    </SiteShell>
  );
}
