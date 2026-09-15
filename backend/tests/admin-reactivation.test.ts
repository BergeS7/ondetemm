import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>, admin: Actor, owner: Actor, other: Actor, company: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
beforeAll(async () => {
  await db.init();
  admin = await db.user('ADMIN');
  owner = await db.user();
  other = await db.user();
  const city = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  company = randomUUID();
  await db.pg.query(
    "insert into companies(id,owner_id,name,slug,short_description,description,state_id,city_id,status) values($1,$2,'Empresa Reativação','empresa-reativacao','Empresa teste','Descrição teste',$3,$4,'ACTIVE')",
    [company, owner.id, city.state_id, city.id],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('Admin reactivation', () => {
  it('reactivates a suspended company', async () => {
    await request(app)
      .post(`/api/admin/companies/${company}/suspend`)
      .set('Authorization', bearer(admin))
      .expect(200);
    let row = await db.pg.query<{ status: string }>('select status from companies where id=$1', [
      company,
    ]);
    expect(row.rows[0]!.status).toBe('SUSPENDED');
    await request(app)
      .post(`/api/admin/companies/${company}/approve`)
      .set('Authorization', bearer(admin))
      .expect(200);
    row = await db.pg.query('select status from companies where id=$1', [company]);
    expect(row.rows[0]!.status).toBe('ACTIVE');
    const logs = await db.pg.query<{ action: string }>(
      "select action from admin_audit_logs where entity_id=$1 and action='COMPANY_REACTIVATED'",
      [company],
    );
    expect(logs.rows).toHaveLength(1);
  });
  it('reactivates a suspended user, restoring login', async () => {
    await request(app)
      .post(`/api/admin/users/${other.id}/suspend`)
      .set('Authorization', bearer(admin))
      .send({ reason: 'Teste de suspensão' })
      .expect(200);
    let row = await db.pg.query<{ status: string }>('select status from profiles where id=$1', [
      other.id,
    ]);
    expect(row.rows[0]!.status).toBe('SUSPENDED');
    await request(app)
      .post(`/api/admin/users/${other.id}/reactivate`)
      .set('Authorization', bearer(owner))
      .expect(403);
    await request(app)
      .post(`/api/admin/users/${other.id}/reactivate`)
      .set('Authorization', bearer(admin))
      .expect(200);
    row = await db.pg.query('select status from profiles where id=$1', [other.id]);
    expect(row.rows[0]!.status).toBe('ACTIVE');
    const logs = await db.pg.query<{ action: string }>(
      "select action from admin_audit_logs where entity_id=$1 and action='USER_REACTIVATED'",
      [other.id],
    );
    expect(logs.rows).toHaveLength(1);
  });
});
