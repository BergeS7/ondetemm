import { createClient } from '@supabase/supabase-js';
import type { Config } from './env.js';
export function supabaseClients(config: Config) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  };
  return {
    publicClient: () => createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, options),
    admin: createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, options),
  };
}
