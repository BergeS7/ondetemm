import 'dotenv/config';
import pg from 'pg';
import { postgresOptions } from '../src/config/postgres.js';
import { z } from 'zod';
const id = z.string().uuid().parse(process.argv[2]);
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error('Configure MIGRATION_DATABASE_URL para provisionamento administrativo');
const client = new pg.Client({
  ...postgresOptions(
    process.env.MIGRATION_DATABASE_URL,
    process.env.DATABASE_SSL !== 'false',
    process.env.DATABASE_SSL_CA_FILE,
  ),
});
await client.connect();
try {
  await client.query('begin');
  const r = await client.query(
    "update public.profiles set role='ADMIN' where id=$1 and status='ACTIVE' returning id",
    [id],
  );
  if (!r.rowCount)
    throw new Error('Usuário ativo não encontrado. Cadastre a conta pelo Supabase Auth primeiro.');
  await client.query(
    "insert into public.admin_audit_logs(action,entity_type,entity_id,metadata) values('ADMIN_PROVISIONED','user',$1,'{\"source\":\"operator-cli\"}')",
    [id],
  );
  await client.query('commit');
  console.log(`ADMIN atribuído ao usuário ${id}`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
