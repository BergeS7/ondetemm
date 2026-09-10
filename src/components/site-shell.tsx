import { MapPin, LogOut, ArrowRight, Store, LoaderCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50";
export function Loading({ text = "Carregando…" }: { text?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </p>
  );
}
export function ErrorNotice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
    >
      {children}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 font-semibold underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function SiteShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:block focus:p-3">
        Pular para o conteúdo
      </a>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-2" aria-label="Onde Tem — início">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand">
              <MapPin />
            </span>
            <span>
              <strong className="block text-xl tracking-tight">
                Onde <span className="text-brand">Tem</span>
              </strong>
              <span className="text-xs text-muted-foreground">
                Comércio e serviços perto de você
              </span>
            </span>
          </a>
          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap items-center gap-3 text-sm"
          >
            <a href="/" className="rounded px-2 py-2 hover:text-brand">
              Buscar empresas
            </a>
            {auth.user ? (
              <>
                <a href="/painel" className="rounded px-2 py-2 font-semibold text-brand">
                  Minhas empresas
                </a>
                <button
                  aria-label="Sair da conta"
                  disabled={leaving}
                  onClick={async () => {
                    setLeaving(true);
                    try {
                      await auth.logout();
                    } catch {
                      /* Local session was cleared. */
                    } finally {
                      setLeaving(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded border border-border px-3 py-2"
                >
                  <LogOut className="h-4 w-4" />
                  {leaving ? "Saindo…" : "Sair"}
                </button>
              </>
            ) : (
              <>
                <a href="/entrar" className="rounded px-2 py-2 font-semibold text-brand">
                  Entrar
                </a>
                <a href="/cadastrar" className={buttonClass}>
                  Criar conta <ArrowRight className="h-4 w-4" />
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer className="mt-16 border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Onde Tem · Comércio local mais perto de você</p>
          <a href="/empresas/nova" className="flex items-center gap-2 font-medium text-brand">
            <Store className="h-4 w-4" />
            Cadastre sua empresa
          </a>
        </div>
      </footer>
    </div>
  );
}
export function RequireAccount({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <Loading text="Verificando sua sessão…" />;
  if (!auth.user)
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border p-8 text-center">
        <h1 className="text-2xl font-bold">Entre para continuar</h1>
        <p className="my-4 text-muted-foreground">
          Acesse sua conta para cadastrar e gerenciar suas empresas.
        </p>
        {auth.error && <ErrorNotice onRetry={() => void auth.reload()}>{auth.error}</ErrorNotice>}
        <div className="flex justify-center gap-3">
          <a href="/entrar" className={buttonClass}>
            Entrar
          </a>
          <a href="/cadastrar" className="px-4 py-3 text-sm font-semibold text-brand">
            Criar conta
          </a>
        </div>
      </div>
    );
  return <>{children}</>;
}
