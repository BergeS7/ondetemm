import type { Config } from '../../config/env.js';
import { supabaseClients } from '../../config/supabase.js';
import { AppError, UnauthorizedError } from '../../shared/errors/index.js';
export interface AuthGateway {
  register(input: { name: string; email: string; password: string }): Promise<unknown>;
  login(input: { email: string; password: string }): Promise<unknown>;
  verify(token: string): Promise<{ id: string }>;
  logout(token: string): Promise<void>;
  forgot(email: string): Promise<void>;
  reset(token: string, password: string): Promise<void>;
  refresh(refreshToken: string): Promise<unknown>;
}
export class SupabaseAuthService implements AuthGateway {
  private clients;
  constructor(private config: Config) {
    this.clients = supabaseClients(config);
  }
  async register(input: { name: string; email: string; password: string }) {
    const { data, error } = await this.clients.publicClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { name: input.name },
        emailRedirectTo: `${this.config.FRONTEND_URL}/auth/callback`,
      },
    });
    if (error)
      throw new AppError(
        400,
        'REGISTRATION_FAILED',
        'Não foi possível cadastrar. Confira os dados e tente novamente.',
      );
    return {
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session,
    };
  }
  async login(input: { email: string; password: string }) {
    const { data, error } = await this.clients.publicClient().auth.signInWithPassword(input);
    if (error) throw new UnauthorizedError('E-mail ou senha inválidos');
    return { user: { id: data.user.id, email: data.user.email }, session: data.session };
  }
  async verify(token: string) {
    const { data, error } = await this.clients.publicClient().auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedError('Token inválido ou expirado');
    return { id: data.user.id };
  }
  async logout(token: string) {
    const { error } = await this.clients.admin.auth.admin.signOut(token, 'global');
    if (error) throw new UnauthorizedError('Sessão inválida');
  }
  async forgot(email: string) {
    const { error } = await this.clients.publicClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${this.config.FRONTEND_URL}/auth/reset-password`,
    });
    if (error && error.status && error.status >= 500)
      throw new AppError(503, 'AUTH_UNAVAILABLE', 'Serviço de autenticação indisponível');
  }
  async reset(token: string, password: string) {
    const response = await fetch(`${this.config.SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: this.config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new AppError(400, 'PASSWORD_RESET_FAILED', 'Não foi possível atualizar a senha');
  }
  async refresh(refreshToken: string) {
    const { data, error } = await this.clients
      .publicClient()
      .auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw new UnauthorizedError();
    return data;
  }
}
