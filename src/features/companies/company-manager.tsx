import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Plus, Save } from "lucide-react";
import { api, message, type Company, type Page } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { Loading, ErrorNotice, buttonClass, inputClass } from "@/components/site-shell";
const muted = "text-sm text-muted-foreground";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-40";
export interface ManagedCompany extends Company {
  logo_url: string | null;
  cover_url: string | null;
}
interface Media {
  id: string;
  url: string;
  preview_url: string;
  type: string;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
function usePrivateList<T>(id: string, kind: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["private", auth.user?.id, "manage", id, kind],
    queryFn: ({ signal }) =>
      api.request<Page<T>>(`/me/companies/${id}/${kind}?limit=100`, {
        authenticated: true,
        signal,
      }),
  });
}
function useRefresh() {
  const cache = useQueryClient();
  const auth = useAuth();
  return async () => {
    await cache.invalidateQueries({ queryKey: ["private", auth.user?.id] });
    await cache.invalidateQueries({ queryKey: ["public-company"] });
    await cache.invalidateQueries({ queryKey: ["search"] });
  };
}
function Box({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className={muted + " mb-6 mt-1"}>{description}</p>
      {children}
    </section>
  );
}
export function MediaEditor({ id, company }: { id: string; company: ManagedCompany }) {
  const images = usePrivateList<Media>(id, "images"),
    refresh = useRefresh();
  const [notice, setNotice] = useState("");
  const upload = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      if (file.size > 5 * 1024 * 1024) throw Error("A imagem deve ter no máximo 5 MB.");
      const body = new FormData();
      body.append("file", file);
      body.append("type", type);
      return api.request(`/companies/${id}/images`, { method: "POST", authenticated: true, body });
    },
    onSuccess: async () => {
      setNotice("Imagem salva no perfil.");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (imageId: string) =>
      api.request(`/images/${imageId}`, { method: "DELETE", authenticated: true }),
    onSuccess: async () => {
      setNotice("Imagem removida.");
      await refresh();
    },
  });
  return (
    <Box
      title="Identidade visual"
      description="Envie imagens JPG, PNG ou WebP de até 5 MB. A capa aparece no topo do perfil e o logo identifica sua empresa."
    >
      {notice && (
        <p role="status" className="mb-4 text-sm text-emerald-600">
          {notice}
        </p>
      )}
      {(upload.error || remove.error) && (
        <ErrorNotice>{message(upload.error || remove.error)}</ErrorNotice>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { type: "LOGO", label: "Logo", url: company.logo_url },
          { type: "COVER", label: "Capa", url: company.cover_url },
          { type: "GALLERY", label: "Adicionar à galeria", url: null },
        ].map((item) => {
          const current = images.data?.data.find((x) => x.url === item.url);
          return (
            <div
              key={item.type}
              className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4"
            >
              <div className="mb-4 grid h-32 place-items-center overflow-hidden rounded-lg bg-white">
                {current ? (
                  <img
                    className="h-full w-full object-contain"
                    src={current.preview_url}
                    alt={item.label}
                  />
                ) : (
                  <ImagePlus size={32} className="text-blue-400" />
                )}
              </div>
              <Field label={item.label}>
                <input
                  aria-label={`Enviar ${item.label}`}
                  className="w-full text-xs"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={upload.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate({ file, type: item.type });
                    e.target.value = "";
                  }}
                />
              </Field>
            </div>
          );
        })}
      </div>
      {upload.isPending && <Loading text="Enviando imagem…" />}
      {images.isPending ? (
        <Loading />
      ) : images.error ? (
        <ErrorNotice onRetry={() => void images.refetch()}>{message(images.error)}</ErrorNotice>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.data.data.map((img) => (
            <article key={img.id} className="overflow-hidden rounded-xl border border-border">
              <img
                src={img.preview_url}
                alt={
                  img.type === "LOGO"
                    ? "Logo da empresa"
                    : img.type === "COVER"
                      ? "Capa da empresa"
                      : "Foto da empresa"
                }
                className="h-32 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-xs">
                  {img.type === "LOGO" ? "Logo" : img.type === "COVER" ? "Capa" : "Galeria"}
                </span>
                <button
                  className="text-xs text-red-600"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Remover esta imagem do perfil?")) remove.mutate(img.id);
                  }}
                >
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Box>
  );
}
type Hour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};
export function HoursEditor({ id }: { id: string }) {
  const query = usePrivateList<Hour>(id, "hours");
  return (
    <Box
      title="Horários de funcionamento"
      description="Informe cada período de atendimento. Adicione dois períodos para incluir uma pausa de almoço."
    >
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice onRetry={() => void query.refetch()}>{message(query.error)}</ErrorNotice>
      ) : (
        <HoursForm id={id} initial={query.data.data} />
      )}
    </Box>
  );
}
function HoursForm({ id, initial }: { id: string; initial: Hour[] }) {
  const [rows, setRows] = useState<Hour[]>(
      initial.map((h) => ({
        ...h,
        opens_at: h.opens_at?.slice(0, 5) ?? null,
        closes_at: h.closes_at?.slice(0, 5) ?? null,
      })),
    ),
    [notice, setNotice] = useState("");
  const refresh = useRefresh();
  const save = useMutation({
    mutationFn: () =>
      api.request(`/companies/${id}/hours`, {
        method: "PUT",
        authenticated: true,
        body: {
          hours: rows.map((h) => ({
            ...h,
            opens_at: h.is_closed ? null : h.opens_at,
            closes_at: h.is_closed ? null : h.closes_at,
          })),
        },
      }),
    onSuccess: async () => {
      setNotice("Horários atualizados.");
      await refresh();
    },
  });
  function field(index: number, key: string, value: unknown) {
    setRows((r) => r.map((h, i) => (i === index ? { ...h, [key]: value } : h)));
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="space-y-3">
        {rows.map((h, i) => (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3" key={i}>
            <select
              aria-label="Dia da semana"
              className={inputClass + " w-auto"}
              value={h.day_of_week}
              onChange={(e) => field(i, "day_of_week", Number(e.target.value))}
            >
              {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map(
                (d, n) => (
                  <option value={n} key={d}>
                    {d}
                  </option>
                ),
              )}
            </select>
            <label className="text-sm">
              <input
                type="checkbox"
                checked={h.is_closed}
                onChange={(e) => field(i, "is_closed", e.target.checked)}
              />{" "}
              Fechado
            </label>
            <input
              aria-label="Abertura"
              type="time"
              className={inputClass + " w-auto"}
              required={!h.is_closed}
              disabled={h.is_closed}
              value={h.opens_at ?? ""}
              onChange={(e) => field(i, "opens_at", e.target.value)}
            />
            <span>até</span>
            <input
              aria-label="Fechamento"
              type="time"
              className={inputClass + " w-auto"}
              required={!h.is_closed}
              disabled={h.is_closed}
              value={h.closes_at ?? ""}
              onChange={(e) => field(i, "closes_at", e.target.value)}
            />
            <button
              type="button"
              className="p-2 text-red-500"
              aria-label="Remover período"
              onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={secondary + " my-4"}
        disabled={rows.length >= 28}
        onClick={() =>
          setRows((r) => [
            ...r,
            { day_of_week: 1, opens_at: "08:00", closes_at: "18:00", is_closed: false },
          ])
        }
      >
        <Plus size={16} />
        Adicionar período
      </button>
      {save.error && <ErrorNotice>{message(save.error)}</ErrorNotice>}
      <p role="status" className="mb-3 text-sm text-emerald-600">
        {notice}
      </p>
      <button disabled={save.isPending} className={buttonClass + " flex"}>
        <Save size={16} />
        {save.isPending ? "Salvando…" : "Salvar horários"}
      </button>
    </form>
  );
}
interface Item {
  id: string;
  name?: string;
  title?: string;
  description: string | null;
  price?: number | null;
  price_type?: string;
  image_url: string | null;
  original_price?: number | null;
  promotional_price?: number | null;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
}
const localTime = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function ItemsEditor({ id, kind }: { id: string; kind: "services" | "promotions" }) {
  const promo = kind === "promotions",
    query = usePrivateList<Item>(id, kind),
    refresh = useRefresh();
  const [editing, setEditing] = useState<Item | null | undefined>(undefined);
  const toggle = useMutation({
    mutationFn: (item: Item) =>
      api.request(`/${kind}/${item.id}`, {
        method: "PATCH",
        authenticated: true,
        body: { is_active: !item.is_active },
      }),
    onSuccess: refresh,
  });
  return (
    <Box
      title={promo ? "Promoções" : "Serviços"}
      description={
        promo
          ? "Gerencie ofertas, preços e datas de validade exibidos no perfil."
          : "Apresente seus serviços com descrição, imagem e preço."
      }
    >
      {editing !== undefined ? (
        <ItemForm
          key={editing?.id ?? "new"}
          id={id}
          kind={kind}
          initial={editing}
          onDone={() => setEditing(undefined)}
        />
      ) : (
        <button className={buttonClass + " mb-5"} onClick={() => setEditing(null)}>
          <Plus size={16} />
          {promo ? "Nova promoção" : "Novo serviço"}
        </button>
      )}
      {toggle.error && <ErrorNotice>{message(toggle.error)}</ErrorNotice>}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice onRetry={() => void query.refetch()}>{message(query.error)}</ErrorNotice>
      ) : query.data.data.length === 0 ? (
        <p className={muted}>Nenhum item cadastrado.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {query.data.data.map((item) => (
            <article className="rounded-xl border border-border p-4" key={item.id}>
              <div className="flex justify-between gap-3">
                <h3 className="font-bold">{item.name || item.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {item.is_active ? "Ativo" : "Oculto"}
                </span>
              </div>
              <p className={muted + " my-2"}>{item.description}</p>
              <div className="flex gap-2">
                <button className={secondary} onClick={() => setEditing(item)}>
                  Editar
                </button>
                <button
                  className={secondary}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(item)}
                >
                  {item.is_active ? "Ocultar" : "Ativar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Box>
  );
}
function ItemForm({
  id,
  kind,
  initial,
  onDone,
}: {
  id: string;
  kind: "services" | "promotions";
  initial: Item | null;
  onDone: () => void;
}) {
  const promo = kind === "promotions",
    refresh = useRefresh();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initial?.name || initial?.title || "",
    description: initial?.description || "",
    price: String((promo ? initial?.promotional_price : initial?.price) ?? ""),
    original_price: String(initial?.original_price ?? ""),
    price_type: initial?.price_type || "CONTACT",
    image_url: initial?.image_url || "",
    starts_at: localTime(initial?.starts_at),
    ends_at: localTime(initial?.ends_at),
    is_active: initial?.is_active ?? true,
  });
  const field = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) throw Error("Envie uma imagem de até 5 MB.");
      const body = new FormData();
      body.append("file", file);
      body.append("type", promo ? "PROMOTION" : "SERVICE");
      return api.request<{ url: string }>(`/companies/${id}/images`, {
        method: "POST",
        authenticated: true,
        body,
      });
    },
    onSuccess: (result) => field("image_url", result.url),
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.request(initial ? `/${kind}/${initial.id}` : `/companies/${id}/${kind}`, {
        method: initial ? "PATCH" : "POST",
        authenticated: true,
        body,
      }),
    onSuccess: async () => {
      await refresh();
      onDone();
    },
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (promo && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError("O fim deve ser posterior ao início.");
      return;
    }
    if (
      promo &&
      form.original_price &&
      form.price &&
      Number(form.price) > Number(form.original_price)
    ) {
      setError("O preço promocional não pode superar o original.");
      return;
    }
    const common = {
      description: form.description || null,
      image_url: form.image_url || null,
      is_active: form.is_active,
    };
    save.mutate(
      promo
        ? {
            ...common,
            title: form.name,
            original_price: form.original_price ? Number(form.original_price) : null,
            promotional_price: form.price ? Number(form.price) : null,
            starts_at: new Date(form.starts_at).toISOString(),
            ends_at: new Date(form.ends_at).toISOString(),
          }
        : {
            ...common,
            name: form.name,
            price_type: form.price_type,
            price: form.price_type === "CONTACT" ? null : Number(form.price),
          },
    );
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="mb-5 space-y-4 rounded-xl bg-slate-50 p-5">
      <Field label="Nome">
        <input
          required
          minLength={2}
          maxLength={160}
          className={inputClass}
          value={form.name}
          onChange={(e) => field("name", e.target.value)}
        />
      </Field>
      <Field label="Descrição">
        <textarea
          maxLength={3000}
          className={inputClass}
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
        />
      </Field>
      <p className="text-sm text-slate-500">
        Envie uma foto do serviço ou reutilize uma imagem já enviada.
      </p>
      <Field label="Enviar imagem">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploadImage.isPending || save.isPending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage.mutate(file);
            e.target.value = "";
          }}
        />
        {uploadImage.isPending && <span>Enviando…</span>}
        {uploadImage.error && <ErrorNotice>{message(uploadImage.error)}</ErrorNotice>}
      </Field>
      <Field label="URL da imagem">
        <input
          className={inputClass}
          placeholder="https://…"
          value={form.image_url}
          onChange={(e) => field("image_url", e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {!promo && (
          <Field label="Tipo de preço">
            <select
              className={inputClass}
              value={form.price_type}
              onChange={(e) => field("price_type", e.target.value)}
            >
              <option value="CONTACT">Sob consulta</option>
              <option value="FIXED">Preço fixo</option>
              <option value="STARTING_AT">A partir de</option>
            </select>
          </Field>
        )}
        {promo && (
          <Field label="Preço original (R$)">
            <input
              className={inputClass}
              type="number"
              min="0"
              max="99999999"
              step="0.01"
              value={form.original_price}
              onChange={(e) => field("original_price", e.target.value)}
            />
          </Field>
        )}
        <Field label={promo ? "Preço promocional (R$)" : "Preço (R$)"}>
          <input
            disabled={!promo && form.price_type === "CONTACT"}
            required={!promo && form.price_type !== "CONTACT"}
            className={inputClass}
            type="number"
            min="0"
            max="99999999"
            step="0.01"
            value={form.price}
            onChange={(e) => field("price", e.target.value)}
          />
        </Field>
        {promo && (
          <>
            <Field label="Início (horário deste dispositivo)">
              <input
                required
                className={inputClass}
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => field("starts_at", e.target.value)}
              />
            </Field>
            <Field label="Fim">
              <input
                required
                className={inputClass}
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => field("ends_at", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => field("is_active", e.target.checked)}
        />
        Exibir no perfil
      </label>
      {(error || save.error) && <ErrorNotice>{error || message(save.error)}</ErrorNotice>}
      <div className="flex gap-3">
        <button className={buttonClass} disabled={save.isPending || uploadImage.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className={secondary} disabled={save.isPending} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
