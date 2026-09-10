import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { AuthForm } from "@/features/auth/auth-form";
export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar | Onde Tem" }] }),
  component: Page,
});
function Page() {
  const navigate = useNavigate();
  return (
    <SiteShell>
      <div className="px-4 py-12">
        <AuthForm mode="login" onSuccess={() => void navigate({ to: "/painel" })} />
      </div>
    </SiteShell>
  );
}
