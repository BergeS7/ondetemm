import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, RequireAccount } from "@/components/site-shell";
import { CompanyEditor } from "@/features/companies/company-form";
export const Route = createFileRoute("/empresas/$id/editar")({
  head: () => ({ meta: [{ title: "Editar cadastro | Onde Tem" }] }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <RequireAccount>
          <h1 className="mb-2 text-3xl font-bold">Revise seu cadastro</h1>
          <p className="mb-8 text-muted-foreground">
            Mantenha o endereço e o WhatsApp sempre atualizados.
          </p>
          <CompanyEditor id={id} />
        </RequireAccount>
      </div>
    </SiteShell>
  );
}
