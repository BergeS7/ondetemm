import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>, admin: Actor, city: string, state: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
beforeAll(async () => {
  await db.init();
  admin = await db.user('ADMIN');
  const c = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  city = c.id;
  state = c.state_id;
  await db.pg.query(
    "insert into companies(id,name,slug,short_description,description,state_id,city_id,status) values($1,'Padaria do Zeca','padaria-zeca','Descrição','Descrição',$2,$3,'ACTIVE')",
    [randomUUID(), state, city],
  );
  await db.pg.query(
    "insert into companies(id,name,slug,short_description,description,state_id,city_id,status) values($1,'Oficina Central','oficina-central','Descrição','Descrição',$2,$3,'ACTIVE')",
    [randomUUID(), state, city],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('Admin search filters', () => {
  it('finds companies by a case/accent-insensitive partial name match', async () => {
    const r = await request(app)
      .get('/api/admin/companies?search=padaria')
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(r.body.data.some((c: { name: string }) => c.name === 'Padaria do Zeca')).toBe(true);
    expect(r.body.data.some((c: { name: string }) => c.name === 'Oficina Central')).toBe(false);
  });
  it('finds users by name or email', async () => {
    const target = await db.user();
    const r = await request(app)
      .get(`/api/admin/users?search=${target.email}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(r.body.data.some((u: { id: string }) => u.id === target.id)).toBe(true);
  });
  it('rejects non-admins', async () => {
    const other = await db.user();
    await request(app)
      .get('/api/admin/companies?search=padaria')
      .set('Authorization', bearer(other))
      .expect(403);
  });
});
