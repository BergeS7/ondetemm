import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, message, type User } from "@/lib/api";
import { parseSession, type Session, ApiError } from "@/lib/api-client";
interface AuthContextValue {
  user: User | null;
  ready: boolean;
  error: string;
  reload: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  complete: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const cache = useQueryClient();
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    setError("");
    if (!api.hasSession()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const profile = await api.request<User>("/auth/me", { authenticated: true });
      if (current === revision.current && api.hasSession()) setUser(profile);
    } catch (e) {
      if (current !== revision.current) return;
      setUser(null);
      setError(message(e));
      if (e instanceof ApiError && e.status === 403) api.setSession(null);
    } finally {
      if (current === revision.current) setReady(true);
    }
  }, []);
  useEffect(() => {
    api.restore();
    void reload();
    return api.subscribe(() => {
      cache.removeQueries({ queryKey: ["private"] });
      setUser(null);
      setReady(false);
      void reload();
    });
  }, [cache, reload]);
  async function complete(session: Session) {
    api.setSession(session);
    await reload();
  }
  async function login(email: string, password: string) {
    const response = await api.request<{ session: unknown }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const session = parseSession(response.session);
    if (!session) throw new Error("Não foi possível iniciar a sessão.");
    await complete(session);
  }
  async function register(name: string, email: string, password: string) {
    const response = await api.request<{ session: unknown }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    const session = parseSession(response.session);
    if (session) {
      await complete(session);
      return true;
    }
    return false;
  }
  async function logout() {
    try {
      await api.request("/auth/logout", { method: "POST", authenticated: true });
    } finally {
      api.setSession(null);
      cache.removeQueries({ queryKey: ["private"] });
      setUser(null);
      setReady(true);
    }
  }
  return (
    <AuthContext.Provider value={{ user, ready, error, reload, login, register, complete, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider ausente");
  return context;
}
