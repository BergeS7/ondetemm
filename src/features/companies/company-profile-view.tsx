import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Star,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Wrench,
  Images,
  Tag,
  BarChart3,
  Eye,
  Instagram,
  Crown,
  Share2,
  Copy,
  Facebook,
  ArrowRight,
  X,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import {
  api,
  apiImage,
  message,
  track,
  queryString,
  type SearchCompany,
  type Category,
  type Page as ApiPage,
} from "@/lib/api";
import { ErrorNotice, buttonClass, CoverPlaceholder } from "@/components/site-shell";
import { useAuth } from "@/features/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import "@/routes/company-profile.css";

export type EditSection = "dados" | "fotos" | "horarios" | "servicos" | "promocoes";
export interface PublicProfile {
  company: SearchCompany & {
    description: string;
    street: string | null;
    number: string | null;
    instagram: string | null;
    zipcode: string | null;
    latitude: number | null;
    longitude: number | null;
    is_claimed: boolean;
  };
  categories: ApiPage<Category>;
  services: ApiPage<{
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    price_type: "FIXED" | "STARTING_AT" | "CONTACT";
    image_url: string | null;
  }>;
  gallery: ApiPage<{ id: string; url: string; type: string }>;
  promotions: ApiPage<{
    id: string;
    title: string;
    description: string | null;
    original_price: number | null;
    promotional_price: number | null;
    image_url: string | null;
  }>;
  hours: ApiPage<{
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }>;
  openStatus: "OPEN" | "CLOSED";
}
const money = (value: number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="profile-panel">
      <div className="profile-panel-heading">
        {icon}
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Stars({ rating }: { rating: number }) {
  return (
    <span className="profile-stars" aria-label={`${rating.toLocaleString("pt-BR")} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} fill={i < Math.round(rating) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}
function instagramUrl(value: string | null) {
  if (!value) return undefined;
  const handle = value.trim();
  if (/^https?:\/\//i.test(handle)) {
    try {
      const url = new URL(handle);
      return ["instagram.com", "www.instagram.com"].includes(url.hostname) ? url.href : undefined;
    } catch {
      return undefined;
    }
  }
  return /^@?[a-zA-Z0-9._]+$/.test(handle)
    ? `https://www.instagram.com/${handle.replace(/^@/, "")}/`
    : undefined;
}
function ClaimBusinessButton({ companyId }: { companyId: string }) {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false),
    [msg, setMsg] = useState(""),
    [sent, setSent] = useState(false),
    [pending, setPending] = useState(false);
  const claim = useMutation({
    mutationFn: () =>
      api.request(`/companies/${companyId}/claim`, {
        method: "POST",
        authenticated: true,
        body: { message: msg || undefined },
      }),
    onSuccess: () => setSent(true),
    onError: (e) => {
      const m = message(e).toLowerCase();
      if (m.includes("pendente") || m.includes("claim")) setPending(true);
    },
  });
  if (!ready) return null;
  if (!user)
    return (
      <a
        className={buttonClass + " bg-brand-teal"}
        href={`/entrar?next=${encodeURIComponent(window.location.pathname)}`}
      >
        <ShieldCheck size={16} />
        Resgatar sua empresa
      </a>
    );
  return (
    <>
      <button
        type="button"
        className={buttonClass + " bg-brand-teal"}
        onClick={() => setOpen(true)}
      >
        <ShieldCheck size={16} />
        Resgatar sua empresa
      </button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSent(false);
            claim.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar esta empresa</DialogTitle>
            <DialogDescription>
              Este anúncio ainda não tem um responsável. Conte como você pode comprovar que é o
              proprietário (telefone, CNPJ, etc.) e nossa equipe vai analisar.
            </DialogDescription>
          </DialogHeader>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Solicitação enviada, nossa equipe vai analisar.
            </p>
          ) : pending ? (
            <p className="text-sm text-muted-foreground">
              Você já tem uma solicitação em análise para esta empresa.
            </p>
          ) : (
            <>
              <Textarea
                placeholder="Ex.: Sou o proprietário, meu CNPJ é..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
              />
              {claim.isError && !pending && (
                <p className="text-sm text-danger">{message(claim.error)}</p>
              )}
              <DialogFooter>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={claim.isPending}
                  onClick={() => claim.mutate()}
                >
                  {claim.isPending ? "Enviando…" : "Enviar solicitação"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function EditChip({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="profile-more"
      style={{
        background: "#eaf4ff",
        padding: "4px 9px",
        borderRadius: 20,
        border: 0,
        cursor: "pointer",
      }}
    >
      <SquarePen size={13} />
      {label}
    </button>
  );
}
export function CompanyProfileView({
  data,
  editable = false,
  onEdit,
}: {
  data: PublicProfile;
  editable?: boolean;
  onEdit?: (section: EditSection) => void;
}) {
  const c = data.company;
  const [allServices, setAllServices] = useState(false),
    [photo, setPhoto] = useState<string | null>(null),
    [shareUrl, setShareUrl] = useState(""),
    [copyStatus, setCopyStatus] = useState("");
  interface Metrics {
    profileViews: number;
    whatsappClicks: number;
    phoneClicks: number;
    instagramClicks: number;
    period: string;
  }
  const metrics = useQuery({
    queryKey: [editable ? "private-metrics" : "public-metrics", c.id],
    queryFn: ({ signal }) =>
      editable
        ? api.request<Metrics>(`/companies/${c.id}/analytics?period=30d`, {
            authenticated: true,
            signal,
          })
        : api.request<Metrics>(`/public/companies/${c.id}/analytics`, { signal }),
    refetchInterval: editable ? false : 30000,
  });
  const record = (event: "WHATSAPP_CLICK" | "PHONE_CLICK" | "INSTAGRAM_CLICK" | "ROUTE_CLICK") => {
    if (editable) return;
    void track(c.id, event).then(() => metrics.refetch());
  };
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);
  useEffect(() => {
    if (!photo) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhoto(null);
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [photo]);
  const related = useQuery({
    queryKey: ["similar-companies", c.id, c.city_slug],
    queryFn: ({ signal }) =>
      api.request<ApiPage<SearchCompany>>(
        `/search?${queryString({
          state: c.state_code,
          city: c.city_slug,
          category: data.categories.data[0]?.slug,
          limit: 5,
        })}`,
        { signal },
      ),
    enabled: !editable,
  });
  const address = [c.street, c.number, c.neighborhood, c.city_name, c.state_code]
    .filter(Boolean)
    .join(", ");
  const destination =
    c.latitude != null && c.longitude != null ? `${c.latitude},${c.longitude}` : address;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const ig = instagramUrl(c.instagram);
  const cover = apiImage(c.cover_url),
    logo = apiImage(c.logo_url);
  const gallery = data.gallery.data.filter((p) => p.type === "GALLERY" && apiImage(p.url));
  const rating = Number(c.average_rating) || 0;
  const services = allServices ? data.services.data : data.services.data.slice(0, 4);
  const edit = (section: EditSection) => () => onEdit?.(section);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Link copiado!");
    } catch {
      setCopyStatus("Copie o endereço na barra do navegador.");
    }
  }
  return (
    <div className="company-profile">
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="profile-instagram-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffb900" />
            <stop offset="40%" stopColor="#ff285a" />
            <stop offset="70%" stopColor="#d500ce" />
            <stop offset="100%" stopColor="#6845e8" />
          </linearGradient>
        </defs>
      </svg>
      <section className="profile-hero">
        {cover ? (
          <img className="profile-cover" src={cover} alt="" />
        ) : (
          <div className="profile-cover">
            <CoverPlaceholder seed={c.id} />
          </div>
        )}
        <div className="profile-wrap">
          {!editable && (
            <nav aria-label="Navegação estrutural" className="profile-breadcrumb">
              <a href="/">Início</a>
              <span>›</span>
              <a href={`/?category=${encodeURIComponent(data.categories.data[0]?.slug ?? "")}`}>
                {data.categories.data[0]?.name ?? "Empresas"}
              </a>
              <span>›</span>
              <span>{c.name}</span>
            </nav>
          )}
          {editable && (
            <div style={{ padding: "16px 0 0" }}>
              <EditChip onClick={edit("fotos")} label="Trocar capa e logo" />
            </div>
          )}
          <div className="profile-heading">
            {logo ? (
              <img className="profile-logo" src={logo} alt={`Logo de ${c.name}`} />
            ) : (
              <div className="profile-logo">
                {c.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </div>
            )}
            <div className="profile-heading-info">
              {c.is_sponsored && (
                <span className="profile-badge">
                  <Star size={11} fill="#ff7531" color="#ff7531" /> Destaque
                </span>
              )}
              <h1>{c.name}</h1>
              {!editable && !c.is_claimed && (
                <div style={{ marginBottom: 8 }}>
                  <ClaimBusinessButton companyId={c.id} />
                </div>
              )}
              {editable && (
                <div style={{ marginBottom: 8 }}>
                  <EditChip onClick={edit("dados")} label="Editar informações" />
                </div>
              )}
              <p className="profile-line">
                <Store />
                {data.categories.data.map((x) => x.name).join(" · ") || c.short_description}
              </p>
              <p className="profile-line">
                <Star fill="#ffbc00" color="#ffbc00" />
                {c.reviews_count > 0 ? (
                  <>
                    <b>{rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</b>
                    <small>({c.reviews_count} avaliações)</small>
                  </>
                ) : (
                  <small>Ainda sem avaliações</small>
                )}
              </p>
              <div className="profile-contact">
                <span className="profile-line" style={{ marginRight: 12 }}>
                  <MapPin />
                  {[c.neighborhood, `${c.city_name} - ${c.state_code}`].filter(Boolean).join(" · ")}
                </span>
                {c.whatsapp && (
                  <a
                    className="profile-action whatsapp"
                    href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => record("WHATSAPP_CLICK")}
                  >
                    <MessageCircle />
                    WhatsApp
                  </a>
                )}
                {c.phone && (
                  <a
                    className="profile-action phone"
                    href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                    onClick={() => record("PHONE_CLICK")}
                  >
                    <Phone />
                    Ligar
                  </a>
                )}
                {!c.phone && (
                  <button
                    className="profile-action phone"
                    disabled
                    title="Telefone ainda não cadastrado"
                  >
                    <Phone />
                    Ligar
                  </button>
                )}
                <a
                  className="profile-action"
                  href={maps}
                  onClick={() => record("ROUTE_CLICK")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin />
                  Como chegar
                </a>
                {ig && (
                  <a
                    className="profile-action instagram"
                    onClick={() => record("INSTAGRAM_CLICK")}
                    href={ig}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram />
                    Instagram
                  </a>
                )}
                {!ig && (
                  <button
                    className="profile-action instagram"
                    disabled
                    title="Instagram ainda não cadastrado"
                  >
                    <Instagram />
                    Instagram
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="profile-wrap">
        <section className="profile-facts" aria-label="Informações rápidas">
          <div className="profile-fact">
            <span
              style={{ fontSize: 23, color: data.openStatus === "OPEN" ? "#009d62" : "#8d9aac" }}
            >
              ●
            </span>
            <div>
              <strong style={{ color: data.openStatus === "OPEN" ? "#009354" : undefined }}>
                {data.hours.data.length
                  ? data.openStatus === "OPEN"
                    ? "Aberto agora"
                    : "Fechado agora"
                  : "Consulte o horário"}
              </strong>
              Horário local da empresa
            </div>
          </div>
          <div className="profile-fact">
            <Clock />
            <details>
              <summary>Horário de funcionamento</summary>
              {data.hours.data.length ? (
                <ul>
                  {data.hours.data.map((h, i) => (
                    <li key={i}>
                      <span>{days[h.day_of_week]}</span>
                      <span>
                        {h.is_closed
                          ? "Fechado"
                          : `${h.opens_at?.slice(0, 5)} – ${h.closes_at?.slice(0, 5)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Não informado</p>
              )}
              {editable && (
                <div style={{ marginTop: 6 }}>
                  <EditChip onClick={edit("horarios")} label="Editar horários" />
                </div>
              )}
            </details>
          </div>
          <div className="profile-fact">
            <DollarSign />
            <div>
              <strong>Faixa de preço</strong>Consulte os serviços
            </div>
          </div>
          <div className="profile-fact">
            <CreditCard />
            <div>
              <strong>Formas de pagamento</strong>Confirme com a empresa
            </div>
          </div>
          <div className="profile-fact">
            <MapPin />
            <div>
              <strong>Endereço</strong>
              {address}
            </div>
          </div>
        </section>
        <div className="profile-columns">
          <div className="profile-main">
            <Panel
              title="Sobre a empresa"
              icon={<FileText />}
              action={editable ? <EditChip onClick={edit("dados")} label="Editar" /> : undefined}
            >
              <div className="profile-about">
                <p>
                  {c.description ||
                    c.short_description ||
                    "A empresa ainda não adicionou uma descrição."}
                </p>
                <blockquote className="profile-quote">“{c.short_description || c.name}”</blockquote>
              </div>
            </Panel>
            <Panel
              title="Serviços"
              icon={<Wrench />}
              action={
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {editable && <EditChip onClick={edit("servicos")} label="Gerenciar serviços" />}
                  {data.services.data.length > 4 && (
                    <button className="profile-more" onClick={() => setAllServices(!allServices)}>
                      {allServices ? "Ver menos" : "Ver todos os serviços"}
                      <ArrowRight />
                    </button>
                  )}
                </div>
              }
            >
              {services.length ? (
                <div className="profile-services">
                  {services.map((s) => (
                    <article className="profile-service" key={s.id}>
                      {apiImage(s.image_url) ? (
                        <img
                          className="profile-service-image"
                          src={apiImage(s.image_url)}
                          alt={s.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="profile-service-image profile-placeholder">
                          <Wrench />
                        </div>
                      )}
                      <div className="profile-service-copy">
                        <h3>{s.name}</h3>
                        <p>{s.description}</p>
                        <strong>
                          {s.price_type === "CONTACT" || s.price === null
                            ? "Sob consulta"
                            : `${s.price_type === "STARTING_AT" ? "A partir de " : ""}${money(s.price)}`}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">
                  {editable
                    ? "Você ainda não cadastrou serviços."
                    : "Os serviços ainda não foram informados. Entre em contato para conhecer as opções."}
                </p>
              )}
            </Panel>
            <Panel
              title="Galeria"
              icon={<Images />}
              action={
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {editable && <EditChip onClick={edit("fotos")} label="Adicionar fotos" />}
                  {gallery.length ? (
                    <span className="profile-muted">
                      {gallery.length} fotos · toque para ampliar
                    </span>
                  ) : undefined}
                </div>
              }
            >
              {gallery.length ? (
                <div className="profile-gallery">
                  {gallery.map((p, i) => (
                    <button
                      key={p.id}
                      aria-label={`Ampliar foto ${i + 1} de ${c.name}`}
                      onClick={() => setPhoto(apiImage(p.url)!)}
                    >
                      <img src={apiImage(p.url)} alt={`${c.name} — foto ${i + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">
                  {editable
                    ? "Você ainda não adicionou fotos à galeria."
                    : "A empresa ainda não adicionou fotos à galeria."}
                </p>
              )}
            </Panel>
            <div className="profile-bottom">
              <Panel
                title="Promoções"
                icon={<Tag style={{ color: "#ffb400" }} />}
                action={
                  editable ? (
                    <EditChip onClick={edit("promocoes")} label="Criar promoção" />
                  ) : undefined
                }
              >
                {data.promotions.data.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {data.promotions.data.map((p) => (
                      <article className="profile-promotion" key={p.id}>
                        {apiImage(p.image_url) && (
                          <img src={apiImage(p.image_url)} alt="" loading="lazy" />
                        )}
                        <span
                          className="profile-badge"
                          style={{ background: "#ff2865", color: "white" }}
                        >
                          Oferta especial
                        </span>
                        <h3>{p.title}</h3>
                        <p>{p.description}</p>
                        <div style={{ marginTop: 15 }}>
                          {p.original_price !== null && (
                            <small>
                              De <s>{money(p.original_price)}</s>
                              <br />
                            </small>
                          )}
                          {p.promotional_price !== null && (
                            <>
                              Por apenas
                              <strong>{money(p.promotional_price)}</strong>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="profile-empty">
                    {editable
                      ? "Você ainda não criou nenhuma promoção."
                      : "Nenhuma promoção ativa no momento."}
                  </p>
                )}
              </Panel>
              <Panel
                title="Avaliações dos clientes"
                icon={<Star fill="#ffb400" style={{ color: "#ffb400" }} />}
              >
                {c.reviews_count > 0 ? (
                  <>
                    <div className="profile-rating">
                      <b>{rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</b>
                      <div>
                        <Stars rating={rating} />
                        <p className="profile-muted">{c.reviews_count} avaliações</p>
                      </div>
                    </div>
                    <p className="profile-empty">
                      Os comentários das avaliações ainda não estão disponíveis.
                    </p>
                  </>
                ) : (
                  <p className="profile-empty">Esta empresa ainda não tem avaliações.</p>
                )}
              </Panel>
            </div>
          </div>
          <aside className="profile-sidebar">
            <Panel title="Estatísticas da empresa" icon={<BarChart3 />}>
              <p className="profile-muted">Últimos 30 dias</p>
              {metrics.error ? (
                <ErrorNotice onRetry={() => void metrics.refetch()}>
                  Não foi possível carregar as métricas.
                </ErrorNotice>
              ) : (
                [
                  { icon: <Eye />, label: "visualizações", key: "profileViews", tone: "views" },
                  {
                    icon: <MessageCircle />,
                    label: "cliques no WhatsApp",
                    key: "whatsappClicks",
                    tone: "whatsapp",
                  },
                  { icon: <Phone />, label: "cliques em Ligar", key: "phoneClicks", tone: "phone" },
                  {
                    icon: <Instagram />,
                    label: "cliques no Instagram",
                    key: "instagramClicks",
                    tone: "instagram",
                  },
                ].map((s) => (
                  <div className={"profile-stat metric-" + s.tone} key={s.key}>
                    {s.icon}
                    <div>
                      <strong aria-label={metrics.isPending ? "Carregando" : undefined}>
                        {metrics.data
                          ? Number(
                              metrics.data[
                                s.key as
                                  | "profileViews"
                                  | "whatsappClicks"
                                  | "phoneClicks"
                                  | "instagramClicks"
                              ],
                            ).toLocaleString("pt-BR")
                          : "…"}
                      </strong>
                      <span className="profile-muted">{s.label}</span>
                    </div>
                  </div>
                ))
              )}
            </Panel>
            {c.is_sponsored && (
              <div className="profile-featured">
                <Crown />
                <div>
                  <strong>Empresa em destaque</strong>
                  Mais visibilidade para quem faz a diferença em {c.city_name}.
                </div>
              </div>
            )}
            {!editable && (
              <Panel title="Compartilhar empresa" icon={<Share2 />}>
                <p className="profile-muted" style={{ marginBottom: 10 }}>
                  Indique para seus amigos!
                </p>
                <div className="profile-share">
                  <a
                    aria-label="Compartilhar no WhatsApp"
                    href={`https://wa.me/?text=${encodeURIComponent(`${c.name} ${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "#00b466", color: "white" }}
                  >
                    <MessageCircle />
                  </a>
                  <a
                    aria-label="Compartilhar no Facebook"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook />
                  </a>
                  <button onClick={() => void copyLink()}>
                    <Copy />
                    Copiar link
                  </button>
                </div>
                <p role="status" className="profile-muted">
                  {copyStatus}
                </p>
              </Panel>
            )}
            <Panel
              title="Localização"
              icon={<MapPin />}
              action={
                <a
                  className="profile-more"
                  href={maps}
                  onClick={() => record("ROUTE_CLICK")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ampliar <ArrowRight />
                </a>
              }
            >
              <iframe
                className="profile-map"
                title={`Localização de ${c.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=16&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="profile-address">
                <strong>{c.name}</strong>
                {address}
                {c.zipcode && (
                  <>
                    <br />
                    {c.zipcode}
                  </>
                )}
              </div>
              <a
                className="profile-more"
                style={{ marginTop: 8 }}
                href={maps}
                onClick={() => record("ROUTE_CLICK")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={14} />
                Como chegar
              </a>
            </Panel>
          </aside>
        </div>
        {!editable && (
          <div className="profile-related">
            <Panel
              title="Empresas semelhantes"
              icon={<Store />}
              action={
                <a
                  className="profile-more"
                  href={`/?city=${encodeURIComponent(c.city_slug)}&state=${c.state_code.toLowerCase()}`}
                >
                  Ver todas <ArrowRight />
                </a>
              }
            >
              {related.isPending ? (
                <p className="profile-muted">Buscando empresas…</p>
              ) : related.error ? (
                <ErrorNotice onRetry={() => void related.refetch()}>
                  Não foi possível carregar as empresas semelhantes.
                </ErrorNotice>
              ) : related.data.data.some((x) => x.id !== c.id) ? (
                <div className="profile-related-grid">
                  {related.data.data
                    .filter((x) => x.id !== c.id)
                    .slice(0, 4)
                    .map((x) => (
                      <a
                        key={x.id}
                        href={`/${x.state_code.toLowerCase()}/${x.city_slug}/${x.slug}`}
                      >
                        {apiImage(x.logo_url) ? (
                          <img src={apiImage(x.logo_url)} alt="" loading="lazy" />
                        ) : (
                          <Store className="profile-related-icon" />
                        )}
                        <div>
                          <strong>{x.name}</strong>
                          <span className="profile-muted">{x.neighborhood || x.city_name}</span>
                          {x.reviews_count > 0 && (
                            <p>
                              ★ {Number(x.average_rating).toLocaleString("pt-BR")} (
                              {x.reviews_count})
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                </div>
              ) : (
                <p className="profile-muted">
                  Ainda não há outras empresas nesta categoria e cidade.
                </p>
              )}
            </Panel>
          </div>
        )}
      </div>
      {photo && (
        <div
          className="profile-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          onClick={() => setPhoto(null)}
        >
          <button ref={closeRef} aria-label="Fechar foto" onClick={() => setPhoto(null)}>
            <X />
          </button>
          <img
            src={photo}
            alt={`Foto de ${c.name} ampliada`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
