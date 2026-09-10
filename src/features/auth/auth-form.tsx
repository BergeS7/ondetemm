import { useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";
import { api, message } from "@/lib/api";
import { buttonClass, inputClass, ErrorNotice } from "@/components/site-shell";
export function AuthForm({
  mode,
  onSuccess,
}: {
  mode: "login" | "register" | "forgot";
  onSuccess: () => void;
}) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "forgot") {
        await api.request("/auth/forgot-password", { method: "POST", body: { email } });
        setNotice(
          "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
        );
      } else if (mode === "register") {
        if (await auth.register(name, email, password)) onSuccess();
        else {
          setPassword("");
          setNotice(
            "Confira seu e-mail para confirmar o cadastro. Depois, volte aqui e entre na sua conta.",
          );
        }
      } else {
        await auth.login(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const title =
    mode === "login"
      ? "Bem-vindo de volta"
      : mode === "register"
        ? "Crie sua conta"
        : "Recuperar senha";
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">Onde Tem</p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "register"
          ? "Cadastre seu negócio e ajude mais pessoas a encontrar você."
          : mode === "login"
            ? "Acesse suas empresas e acompanhe seus cadastros."
            : "Vamos enviar as instruções para o seu e-mail."}
      </p>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {notice && (
        <p role="status" className="my-4 rounded-lg bg-brand-soft p-4 text-sm text-brand">
          {notice}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <label className="block text-sm font-medium">
            Seu nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
              disabled={busy}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          E-mail
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            disabled={busy}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        {mode !== "forgot" && (
          <label className="block text-sm font-medium">
            Senha
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
              disabled={busy}
              className={`${inputClass} mt-1.5`}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Pelo menos 8 caracteres.
            </span>
          </label>
        )}
        <button disabled={busy} className={`${buttonClass} w-full`}>
          {busy
            ? "Aguarde…"
            : mode === "login"
              ? "Entrar"
              : mode === "register"
                ? "Criar minha conta"
                : "Enviar link"}
        </button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-brand">
        {mode === "login" ? (
          <>
            <a href="/cadastrar" className="underline">
              Criar conta
            </a>
            <a href="/recuperar-senha" className="underline">
              Esqueci minha senha
            </a>
          </>
        ) : (
          <a href="/entrar" className="underline">
            Voltar para entrar
          </a>
        )}
      </div>
    </div>
  );
}
