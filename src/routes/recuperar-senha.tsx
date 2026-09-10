import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { AuthForm } from "@/features/auth/auth-form";
export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha | Onde Tem" }] }),
  component: Page,
});
function Page() {
  return (
    <SiteShell>
      <div className="px-4 py-12">
        <AuthForm mode="forgot" onSuccess={() => {}} />
      </div>
    </SiteShell>
  );
}
