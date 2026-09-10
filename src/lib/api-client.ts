export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function parseSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (
    typeof s["access_token"] !== "string" ||
    !s["access_token"] ||
    typeof s["refresh_token"] !== "string" ||
    !s["refresh_token"]
  )
    return null;
  const expires =
    typeof s["expires_at"] === "number"
      ? s["expires_at"]
      : Math.floor(Date.now() / 1000) +
        (typeof s["expires_in"] === "number" ? s["expires_in"] : 3600);
  return {
    access_token: s["access_token"],
    refresh_token: s["refresh_token"],
    expires_at: expires,
  };
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
  signal?: AbortSignal;
}

/** Tokens never go into URLs, query caches or frontend environment variables. */
export class ApiClient {
  private session: Session | null = null;
  private generation = 0;
  private refreshing: Promise<Session> | null = null;
  private listeners = new Set<() => void>();
  private readonly storageKey = "onde-tem-session";
  constructor(
    public readonly baseUrl: string,
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private storage?: Storage,
  ) {}
  private getStorage() {
    try {
      return this.storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);
    } catch {
      return undefined;
    }
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  restore() {
    try {
      this.session = parseSession(
        JSON.parse(this.getStorage()?.getItem(this.storageKey) ?? "null"),
      );
    } catch {
      this.session = null;
    }
    return this.session;
  }
  hasSession() {
    return this.session !== null;
  }
  setSession(session: Session | null) {
    this.generation++;
    this.session = session;
    try {
      if (session) this.getStorage()?.setItem(this.storageKey, JSON.stringify(session));
      else this.getStorage()?.removeItem(this.storageKey);
    } catch {
      /* In-memory session still works if storage is unavailable. */
    }
    for (const listener of this.listeners) listener();
  }
  private async refresh(): Promise<Session> {
    if (this.refreshing) return this.refreshing;
    if (!this.session)
      throw new ApiError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
    const generation = this.generation;
    const refreshToken = this.session.refresh_token;
    const pending = (async () => {
      const response = await this.send<{ session: unknown }>("/auth/refresh", {
        method: "POST",
        body: { refresh_token: refreshToken },
      });
      const session = parseSession(response.session);
      if (!session || generation !== this.generation)
        throw new ApiError(401, "SESSION_EXPIRED", "Entre novamente para continuar.");
      // Token rotation preserves the current identity and does not invalidate active queries.
      this.session = session;
      try {
        this.getStorage()?.setItem(this.storageKey, JSON.stringify(session));
      } catch {
        /* Memory fallback. */
      }
      return session;
    })();
    this.refreshing = pending;
    try {
      return await pending;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && generation === this.generation)
        this.setSession(null);
      throw error;
    } finally {
      if (this.refreshing === pending) this.refreshing = null;
    }
  }
  private async send<T>(path: string, options: RequestOptions, token?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000);
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers,
        credentials: "omit",
        signal,
        ...(options.body !== undefined
          ? { body: isForm ? (options.body as FormData) : JSON.stringify(options.body) }
          : {}),
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Não foi possível conectar ao servidor. Tente novamente em instantes.",
      );
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const failure =
        payload && typeof payload === "object" && "error" in payload
          ? (payload.error as { code?: string; message?: string })
          : undefined;
      throw new ApiError(
        response.status,
        failure?.code ?? "API_ERROR",
        failure?.message ?? "Não foi possível concluir esta operação.",
      );
    }
    return payload as T;
  }
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!options.authenticated) return this.send<T>(path, options);
    if (!this.session)
      throw new ApiError(401, "SESSION_EXPIRED", "Entre na sua conta para continuar.");
    const generation = this.generation;
    const session =
      this.session.expires_at <= Date.now() / 1000 + 30 ? await this.refresh() : this.session;
    try {
      return await this.send<T>(path, options, session.access_token);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || generation !== this.generation)
        throw error;
      const refreshed = await this.refresh();
      try {
        return await this.send<T>(path, options, refreshed.access_token);
      } catch (retryError) {
        if (
          retryError instanceof ApiError &&
          retryError.status === 401 &&
          generation === this.generation
        )
          this.setSession(null);
        throw retryError;
      }
    }
  }
}
