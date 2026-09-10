import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_URL: z.string().url(),
  PUBLIC_SITE_URL: z.string().url().default('https://ondetemm.com'),
  CORS_ORIGINS: z.string().min(1),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL_CA_FILE: z.string().min(1).optional(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().default(''),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().default(''),
  IP_HASH_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
});
export type Config = z.infer<typeof schema>;
export function loadConfig(): Config {
  return schema.parse(process.env);
}
