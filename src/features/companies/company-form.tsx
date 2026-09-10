import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  api,
  allPages,
  message,
  type Company,
  type State,
  type City,
  type Category,
} from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { buttonClass, inputClass, ErrorNotice, Loading } from "@/components/site-shell";

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}
export const companyInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa").max(160),
  short_description: z
    .string()
    .trim()
    .min(5, "Escreva um resumo com pelo menos 5 caracteres")
    .max(280),
  description: z.string().trim().min(5, "Descreva sua empresa").max(10000),
  state_id: z.string().uuid("Selecione um estado"),
  city_id: z.string().uuid("Selecione uma cidade"),
  category: z.string().uuid("Selecione uma categoria"),
  street: z.string().trim().min(2, "Informe o endereço").max(200),
  number: z.string().trim().max(20),
  neighborhood: z.string().trim().max(120),
  whatsapp: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\d{10,15}$/, "Informe um WhatsApp com DDD")),
});

export function CompanyForm({
  initial,
  onSaved,
}: {
  initial?: Company;
  onSaved: (company: Company) => void;
}) {
  const auth = useAuth(),
    cache = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    state_id: initial?.state_id ?? "",
    city_id: initial?.city_id ?? "",
    category: initial?.category_ids?.[0] ?? "",
    street: initial?.street ?? "",
    number: initial?.number ?? "",
    neighborhood: initial?.neighborhood ?? "",
    whatsapp: initial?.whatsapp ?? "",
  });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const states = useQuery({
    queryKey: ["states"],
    queryFn: ({ signal }) => allPages<State>("/states", signal),
  });
  const cities = useQuery({
    queryKey: ["cities", form.state_id],
    queryFn: ({ signal }) => allPages<City>(`/states/${form.state_id}/cities`, signal),
    enabled: !!form.state_id,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => allPages<Category>("/categories", signal),
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.request<Company>(initial ? `/companies/${initial.id}` : "/companies", {
        method: initial ? "PATCH" : "POST",
        authenticated: true,
        body,
      }),
    onSuccess: async (company) => {
      await cache.invalidateQueries({ queryKey: ["private", auth.user?.id] });
      setNotice("Cadastro salvo com sucesso.");
      onSaved(company);
    },
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (save.isPending) return;
    setError("");
    setNotice("");
    const result = companyInputSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(". "));
      return;
    }
    const { category, ...fields } = result.data;
    try {
      await save.mutateAsync({
        ...fields,
        number: fields.number || null,
        neighborhood: fields.neighborhood || null,
        category_ids: [...new Set([category, ...(initial?.category_ids?.slice(1) ?? [])])],
      });
    } catch (err) {
      setError(message(err));
    }
  }
  function field(key: keyof typeof form, value: string) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "state_id" ? { city_id: "" } : {}),
    }));
  }
  const catalogsError = states.error ?? cities.error ?? categories.error;
  return (
    <form
      onSubmit={submit}
      className="space-y-7 rounded-2xl border border-border bg-card p-5 sm:p-8"
    >
      <div>
        <h2 className="text-lg font-bold">Informações da empresa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados que seus clientes precisam para encontrar você.
        </p>
      </div>
      {error && <ErrorNotice>{error}</ErrorNotice>}
      {notice && (
        <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm text-brand">
          {notice}
        </p>
      )}
      {catalogsError && (
        <ErrorNotice
          onRetry={() => {
            void states.refetch();
            void categories.refetch();
            if (form.state_id) void cities.refetch();
          }}
        >
          {message(catalogsError)}
        </ErrorNotice>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Nome da empresa *
          <input
            className={`${inputClass} mt-1.5`}
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            autoComplete="organization"
            maxLength={160}
            minLength={2}
            required
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Resumo *
          <input
            className={`${inputClass} mt-1.5`}
            value={form.short_description}
            onChange={(e) => field("short_description", e.target.value)}
            maxLength={280}
            minLength={5}
            placeholder="Ex.: Restaurante com almoço caseiro e churrasco"
            required
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Sobre a empresa *
          <textarea
            className={`${inputClass} mt-1.5 min-h-28`}
            value={form.description}
            onChange={(e) => field("description", e.target.value)}
            minLength={5}
            maxLength={10000}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Categoria *
          <select
            className={`${inputClass} mt-1.5`}
            value={form.category}
            onChange={(e) => field("category", e.target.value)}
            required
            disabled={categories.isPending}
          >
            <option value="">Selecione</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          WhatsApp com DDD *
          <input
            className={`${inputClass} mt-1.5`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.whatsapp}
            onChange={(e) => field("whatsapp", e.target.value)}
            placeholder="(98) 99999-9999"
            maxLength={24}
            required
          />
        </label>
      </div>
      <div>
        <h2 className="text-lg font-bold">Onde sua empresa fica?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha a cidade e informe o endereço de atendimento.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Estado *
          <select
            className={`${inputClass} mt-1.5`}
            value={form.state_id}
            onChange={(e) => field("state_id", e.target.value)}
            required
            disabled={states.isPending}
          >
            <option value="">Selecione</option>
            {states.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Cidade *
          <select
            className={`${inputClass} mt-1.5`}
            value={form.city_id}
            onChange={(e) => field("city_id", e.target.value)}
            required
            disabled={!form.state_id || cities.isPending}
          >
            <option value="">
              {!form.state_id ? "Selecione o estado primeiro" : "Selecione a cidade"}
            </option>
            {cities.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Rua / avenida *
          <input
            className={`${inputClass} mt-1.5`}
            value={form.street}
            onChange={(e) => field("street", e.target.value)}
            autoComplete="address-line1"
            maxLength={200}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Número
          <input
            className={`${inputClass} mt-1.5`}
            value={form.number}
            onChange={(e) => field("number", e.target.value)}
            maxLength={20}
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Bairro
          <input
            className={`${inputClass} mt-1.5`}
            value={form.neighborhood}
            onChange={(e) => field("neighborhood", e.target.value)}
            maxLength={120}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-5">
        <button
          disabled={save.isPending || !!catalogsError || states.isPending || categories.isPending}
          className={buttonClass}
        >
          {save.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Salvar cadastro"}
        </button>
        <a href="/painel" className="text-sm text-muted-foreground underline">
          Voltar para minhas empresas
        </a>
        <p className="w-full text-xs text-muted-foreground">
          O cadastro será salvo para você revisar antes de enviar para aprovação.
        </p>
      </div>
    </form>
  );
}

export function CompanyEditor({ id }: { id: string }) {
  const auth = useAuth();
  const company = useQuery({
    queryKey: ["private", auth.user?.id, "company", id],
    queryFn: ({ signal }) =>
      api.request<Company>(`/companies/${id}`, { authenticated: true, signal }),
    enabled: !!auth.user,
  });
  if (company.isPending) return <Loading text="Carregando cadastro…" />;
  if (company.error)
    return (
      <ErrorNotice onRetry={() => void company.refetch()}>{message(company.error)}</ErrorNotice>
    );
  if (company.data.status === "SUSPENDED")
    return (
      <ErrorNotice>
        Este cadastro está suspenso. Entre em contato com a administração para solicitar uma
        revisão.
      </ErrorNotice>
    );
  return (
    <>
      <CompanyForm initial={company.data} onSaved={() => {}} />
      <div className="mt-6">
        <a href="/painel" className={buttonClass}>
          Ir ao painel para enviar à aprovação
        </a>
      </div>
    </>
  );
}
