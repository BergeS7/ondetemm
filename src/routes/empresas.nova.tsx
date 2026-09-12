import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  SiteShell,
  RequireAccount,
  PageLoading,
  ErrorNotice,
  buttonClass,
} from "@/components/site-shell";
import { CompanyForm } from "@/features/companies/company-form";
import { useAuth } from "@/features/auth/auth-provider";
import { api, message, type Page as ApiPage, type Company } from "@/lib/api";
export const Route = createFileRoute("/empresas/nova")({
  head: () => ({ meta: [{ title: "Cadastrar empresa | Onde Tem" }] }),
  component: Page,
});
function Form() {
  const navigate = useNavigate();
  const auth = useAuth();
  const companies = useQuery({
    queryKey: ["private", auth.user?.id, "companies-all"],
    queryFn: ({ signal }) =>
      api.request<ApiPage<Company>>("/me/companies?page=1&limit=1", {
        authenticated: true,
        signal,
      }),
    enabled: !!auth.user,
  });
  if (companies.isPending) return <PageLoading text="Verificando sua conta" />;
  if (companies.error)
    return (
      <ErrorNotice onRetry={() => void companies.refetch()}>{message(companies.error)}</ErrorNotice>
    );
  if (companies.data.data.length > 0)
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <h2 className="text-xl font-bold">Você já tem uma empresa cadastrada</h2>
        <p className="mx-auto my-3 max-w-md text-sm text-muted-foreground">
          Cada conta pode gerenciar apenas uma empresa. Acesse o painel para editar o seu perfil.
        </p>
        <a href="/painel" className={`${buttonClass} mt-3`}>
          Ir para o painel
        </a>
      </div>
    );
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Cadastre sua empresa</h1>
      <p className="mb-8 text-muted-foreground">
        Seu negócio pode ser a próxima descoberta de alguém.
      </p>
      <CompanyForm onSaved={() => void navigate({ to: "/painel", hash: "perfil" })} />
    </>
  );
}
function Page() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <RequireAccount>
          <Form />
        </RequireAccount>
      </div>
    </SiteShell>
  );
}
