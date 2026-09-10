import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, message } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { consumeSessionLink } from "@/features/auth/session-link";
import { SiteShell, ErrorNotice, Loading, inputClass, buttonClass } from "@/components/site-shell";
export const Route = createFileRoute("/auth/reset-password")({ component: Page });
function Page() {
  const auth = useAuth(),
    started = useRef(false);
  const [error, setError] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const link = consumeSessionLink();
        if (link) await auth.complete(link.session);
      } catch (e) {
        setError(message(e));
      }
    })();
  }, [auth]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.request("/auth/reset-password", {
        method: "POST",
        authenticated: true,
        body: { password },
      });
      setSuccess(true);
      setPassword("");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-5 text-2xl font-bold">Definir nova senha</h1>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        {!auth.ready ? (
          <Loading />
        ) : success ? (
          <p role="status">
            Senha alterada.{" "}
            <a href="/painel" className="text-brand underline">
              Ir para minhas empresas
            </a>
          </p>
        ) : !auth.user ? (
          <p>
            Abra o link recebido por e-mail.{" "}
            <a href="/recuperar-senha" className="text-brand underline">
              Solicitar um novo link
            </a>
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm font-medium">
              Nova senha
              <input
                className={`${inputClass} mt-2`}
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className={buttonClass} disabled={busy}>
              {busy ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
