import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { postgresOptions } from '../src/config/postgres.js';
const seed = process.argv.includes('--seed'),
  directory = seed ? 'seeds' : 'migrations';
const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Configure MIGRATION_DATABASE_URL');
const client = new pg.Client({
  ...postgresOptions(
    connectionString,
    process.env.DATABASE_SSL !== 'false',
    process.env.DATABASE_SSL_CA_FILE,
  ),
});
await client.connect();
try {
  await client.query("select pg_advisory_lock(hashtext('onde-tem-migrations'))");
  await client.query(
    'create table if not exists public.schema_migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now())',
  );
  await client.query('revoke all on public.schema_migrations from anon,authenticated');
  for (const name of (await readdir(directory)).filter((n) => n.endsWith('.sql')).sort()) {
    const content = await readFile(`${directory}/${name}`, 'utf8'),
      key = `${directory}/${name}`,
      checksum = createHash('sha256').update(content).digest('hex');
    const old = (
      await client.query<{ checksum: string }>(
        'select checksum from public.schema_migrations where name=$1',
        [key],
      )
    ).rows[0];
    if (old) {
      if (old.checksum !== checksum)
        throw new Error(`Migration aplicada foi modificada: ${key}. Crie uma nova migration.`);
      continue;
    }
    await client.query('begin');
    try {
      await client.query(content);
      await client.query('insert into public.schema_migrations(name,checksum) values($1,$2)', [
        key,
        checksum,
      ]);
      await client.query('commit');
      console.log(`Aplicado: ${key}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.end();
}
