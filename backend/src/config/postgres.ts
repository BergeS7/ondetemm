import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

/** One verified TLS policy shared by runtime and administrative scripts. */
export function postgresOptions(
  connectionString: string,
  sslEnabled: boolean,
  caFile?: string,
): PoolConfig {
  const url = new URL(connectionString);
  // pg connection-string SSL options otherwise replace the explicit CA configuration.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: sslEnabled
      ? { rejectUnauthorized: true, ...(caFile ? { ca: readFileSync(caFile, 'utf8') } : {}) }
      : false,
  };
}
