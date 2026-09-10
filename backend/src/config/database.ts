import pg from 'pg';
import { postgresOptions } from './postgres.js';
import type { Actor, Database, Sql } from '../shared/types/index.js';
import type { Config } from './env.js';
export async function setScope(sql: Sql, actor: Actor | 'system' | undefined) {
  const role = actor === 'system' ? 'service_role' : actor ? 'authenticated' : 'anon';
  // Only hard-coded identifiers; never interpolate a role supplied by a request.
  await sql.query(`set local role ${role}`);
  await sql.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: typeof actor === 'object' ? actor.id : undefined, role }),
  ]);
}
export class PgDatabase implements Database {
  private pool: pg.Pool;
  constructor(config: Config) {
    this.pool = new pg.Pool({
      ...postgresOptions(config.DATABASE_URL, config.DATABASE_SSL, config.DATABASE_SSL_CA_FILE),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
    });
  }
  async run<T>(actor: Actor | 'system' | undefined, work: (sql: Sql) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await setScope(client, actor);
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  close() {
    return this.pool.end();
  }
}
