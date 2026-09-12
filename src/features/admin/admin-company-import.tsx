import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, message, type Page, type Company, type User } from "@/lib/api";
import lote from "./lote-santa-ines.json";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const identity = (name: string, city: string) => `${normalize(name)}|${city}`;
const journalKey = "ondetemm-importacao-santa-ines-v1";
type Result = { nome: string; status: string; id?: string };

export function AdminCompanyImport() {
  const [running, setRunning] = useState(false);
  const busy = useRef(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const cache = useQueryClient();
  async function execute() {
    if (busy.current) return;
    busy.current = true;
    setRunning(true); setError(""); setResults([]);
    try {
      await navigator.locks.request(journalKey, { ifAvailable: true }, async lock => {
        if (!lock) throw new Error("Já existe uma importação em outra aba.");
        const profile = await api.request<User>("/auth/me", { authenticated: true });
        if (profile.role !== "ADMIN") throw new Error("Entre com uma conta ADM.");
        const seen = new Set<string>();
        for (let page = 1; ; page++) {
          const data = await api.request<Page<Company>>(`/admin/companies?page=${page}&limit=100`, { authenticated: true });
          for (const row of data.data) seen.add(identity(row.name, row.city_id));
          if (page >= data.pagination.totalPages) break;
        }
        const journal: Record<string, string> = JSON.parse(localStorage.getItem(journalKey) || "{}");
        const completed: Result[] = [];
        for (const entry of lote) {
          const key = identity(entry.payload.name, entry.payload.city_id);
          let result: Result;
          if (seen.has(key)) result = { nome: entry.nome, status: "Já cadastrada — preservada" };
          else if (journal[key]) result = { nome: entry.nome, status: "Conferir tentativa anterior no painel" };
          else {
            journal[key] = "Tentativa iniciada";
            localStorage.setItem(journalKey, JSON.stringify(journal));
            try {
              const company = await api.request<Company>("/admin/companies", { method: "POST", authenticated: true, body: entry.payload });
              journal[key] = company.id;
              localStorage.setItem(journalKey, JSON.stringify(journal));
              seen.add(key);
              result = { nome: entry.nome, status: "Cadastrada e publicada", id: company.id };
            } catch (e) {
              result = { nome: entry.nome, status: `Não concluída: ${message(e)}. Confira o painel antes de repetir.` };
            }
          }
          completed.push(result);
          setResults([...completed]);
          localStorage.setItem(journalKey + "-relatorio", JSON.stringify(completed));
        }
        await cache.invalidateQueries();
      });
    } catch (e) { setError(message(e)); }
    finally { busy.current = false; setRunning(false); }
  }
  return <section className="mb-8 rounded-2xl border border-border bg-card p-6" aria-label="Bot de cadastro">
    <h2 className="text-xl font-bold">Bot de cadastro — Santa Inês</h2>
    <p className="my-3 text-sm">Seis empresas pesquisadas em fontes públicas. O cadastro pelo ADM publica as empresas sem proprietário, disponíveis para reivindicação. Empresas já cadastradas são preservadas.</p>
    <ul className="mb-4 space-y-2">{lote.map(row => <li key={row.nome}><strong>{row.nome}</strong> — <a className="underline" href={row.fonte} target="_blank" rel="noreferrer">Fonte da pesquisa</a><p className="text-xs text-muted-foreground">{row.observacao}</p></li>)}</ul>
    <button type="button" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={running} onClick={() => void execute()}>{running ? "Cadastrando empresas…" : "Cadastrar as 6 empresas pesquisadas"}</button>
    {error && <p role="alert" className="mt-3">{error}</p>}
    <div role="status" className="mt-4 space-y-2">{results.map(row => <p key={row.nome}>{row.nome}: {row.status}{row.id ? ` — ID: ${row.id}` : ""}</p>)}</div>
  </section>;
}
