import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell, RequireAccount } from "@/components/site-shell";
import { CompanyForm } from "@/features/companies/company-form";
export const Route = createFileRoute("/empresas/nova")({
  head: () => ({ meta: [{ title: "Cadastrar empresa | Onde Tem" }] }),
  component: Page,
});
function Page() {
  const navigate = useNavigate();
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <RequireAccount>
          <h1 className="mb-2 text-3xl font-bold">Cadastre sua empresa</h1>
          <p className="mb-8 text-muted-foreground">
            Seu negócio pode ser a próxima descoberta de alguém.
          </p>
          <CompanyForm
            onSaved={(c) => void navigate({ to: "/empresas/$id/editar", params: { id: c.id } })}
          />
        </RequireAccount>
      </div>
    </SiteShell>
  );
}
