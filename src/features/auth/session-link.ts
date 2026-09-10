import { parseSession } from "@/lib/api-client";
export function consumeSessionLink() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has("access_token") && !params.has("error")) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (params.get("error"))
    throw new Error("Este link é inválido ou expirou. Solicite um novo link e tente novamente.");
  const session = parseSession({
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_in: Number(params.get("expires_in") || 3600),
  });
  if (!session) throw new Error("O link não contém uma sessão válida.");
  return { session, recovery: params.get("type") === "recovery" };
}
