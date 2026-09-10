import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Actor, Database, Row, Sql } from '../src/shared/types/index.js';
import { setScope } from '../src/config/database.js';
import type { Config } from '../src/config/env.js';
import type { AuthGateway } from '../src/modules/auth/auth.service.js';
import type { ImageStorage } from '../src/modules/uploads/uploads.service.js';
import { UnauthorizedError } from '../src/shared/errors/index.js';
export const config: Config = {
  NODE_ENV: 'test',
  PORT: 3001,
  FRONTEND_URL: 'http://localhost:5173',
  PUBLIC_SITE_URL: 'https://ondetemm.com',
  CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY_HOPS: 0,
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test',
  SUPABASE_SERVICE_ROLE_KEY: 'test',
  DATABASE_URL: 'test',
  DATABASE_SSL: false,
  MERCADO_PAGO_ACCESS_TOKEN: 'test',
  MERCADO_PAGO_WEBHOOK_SECRET: 'test-webhook-secret',
  IP_HASH_SECRET: 'test-only-secret-with-at-least-32-characters',
  LOG_LEVEL: 'silent',
};
export class TestDatabase implements Database {
  pg = new PGlite();
  async init() {
    await this.pg
      .exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to public;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated,service_role;grant select on storage.objects to anon,authenticated;`);
    for (const name of (await readdir('migrations')).filter((n) => n.endsWith('.sql')).sort()) {
      const sql = await readFile(`migrations/${name}`, 'utf8');
      await this.pg.exec(sql.replace('create extension if not exists pgcrypto;', ''));
    }
    await this.pg.exec(await readFile('seeds/001_initial.sql', 'utf8'));
  }
  async run<T>(actor: Actor | 'system' | undefined, work: (s: Sql) => Promise<T>) {
    return this.pg.transaction(async (tx) => {
      const sql: Sql = {
        async query<R extends Row = Row>(text: string, values: unknown[] = []) {
          const r = await tx.query<R>(text, values);
          return { rows: r.rows, rowCount: r.affectedRows ?? null };
        },
      };
      await setScope(sql, actor);
      return work(sql);
    });
  }
  async user(role: Actor['role'] = 'USER') {
    const id = randomUUID(),
      email = `${id}@example.com`;
    await this.pg.query(
      'insert into auth.users(id,email,raw_user_meta_data) values($1,$2,\'{"name":"Test User"}\')',
      [id, email],
    );
    await this.pg.query('update public.profiles set role=$2 where id=$1', [id, role]);
    return { id, email, role, status: 'ACTIVE' as const, token: id };
  }
  close() {
    return this.pg.close();
  }
}
export class FakeAuth implements AuthGateway {
  constructor(private db: TestDatabase) {}
  async verify(token: string) {
    const r = await this.db.pg.query('select id from auth.users where id::text=$1', [token]);
    if (!r.rows.length) throw new UnauthorizedError();
    return { id: token };
  }
  async register(input: { name: string; email: string; password: string }) {
    void input.password;
    const id = randomUUID();
    await this.db.pg.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      input.email,
      JSON.stringify({ name: input.name }),
    ]);
    return { user: { id, email: input.email }, session: null };
  }
  async login(input: { email: string; password: string }) {
    const r = await this.db.pg.query<{ id: string }>('select id from auth.users where email=$1', [
      input.email,
    ]);
    if (!r.rows[0] || input.password !== 'test-password') throw new UnauthorizedError();
    return { session: { access_token: r.rows[0].id } };
  }
  async logout(token: string) {
    await this.verify(token);
  }
  async forgot(_email: string) {}
  async reset(token: string, _password: string) {
    await this.verify(token);
  }
  async refresh(refreshToken: string) {
    await this.verify(refreshToken);
    return { session: { access_token: refreshToken } };
  }
}
export class FakeStorage implements ImageStorage {
  objects = new Map<string, Buffer>();
  async put(p: string, b: Buffer) {
    this.objects.set(p, b);
  }
  async remove(p: string) {
    this.objects.delete(p);
  }
  async sign(p: string) {
    return `https://example.supabase.co/storage/v1/object/sign/company-images/${p}`;
  }
}
