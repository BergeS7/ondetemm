import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { consumeSessionLink } from "@/features/auth/session-link";
import { SiteShell, PageLoading, ErrorNotice } from "@/components/site-shell";
import { message } from "@/lib/api";
export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: Page,
});
function Page() {
  const auth = useAuth(),
    navigate = useNavigate(),
    started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const link = consumeSessionLink();
        if (!link) {
          await navigate({ to: "/entrar" });
          return;
        }
        await auth.complete(link.session);
        await navigate({ to: link.recovery ? "/auth/reset-password" : "/painel" });
      } catch (e) {
        setError(message(e));
      }
    })();
  }, [auth, navigate]);
  return (
    <SiteShell>
      <div className="mx-auto max-w-lg px-4 py-12">
        {error ? (
          <>
            <ErrorNotice>{error}</ErrorNotice>
            <a href="/entrar" className="text-brand underline">
              Voltar para entrar
            </a>
          </>
        ) : (
          <PageLoading text="Confirmando seu acesso" />
        )}
      </div>
    </SiteShell>
  );
}
