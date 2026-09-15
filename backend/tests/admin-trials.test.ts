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
    "insert into companies(id,owner_id,name,slug,short_description,description,state_id,city_id,status) values($1,$2,'Empresa Teste Trial','empresa-teste-trial','Empresa de teste','Descrição teste',$3,$4,'ACTIVE')",
    [company, owner.id, city.state_id, city.id],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('Admin-granted free trials', () => {
  it('rejects non-admins', async () => {
    await request(app)
      .post(`/api/admin/companies/${company}/trial`)
      .set('Authorization', bearer(other))
      .send({ plan_code: 'PREMIUM', days: 7 })
      .expect(403);
  });
  it('grants a temporary paid plan and it reflects on effective_plan', async () => {
    const before = await db.pg.query<{ code: string }>(
      'select code from plans where id=effective_plan($1)',
      [company],
    );
    expect(before.rows[0]!.code).toBe('FREE');
    const grant = await request(app)
      .post(`/api/admin/companies/${company}/trial`)
      .set('Authorization', bearer(admin))
      .send({ plan_code: 'PREMIUM', days: 7 })
      .expect(201);
    expect(grant.body.status).toBe('ACTIVE');
    const after = await db.pg.query<{ code: string }>(
      'select code from plans where id=effective_plan($1)',
      [company],
    );
    expect(after.rows[0]!.code).toBe('PREMIUM');
    const cachedPlan = await db.pg.query<{ code: string }>(
      'select p.code from companies c join plans p on p.id=c.plan_id where c.id=$1',
      [company],
    );
    expect(cachedPlan.rows[0]!.code).toBe('PREMIUM');
  });
  it('blocks granting a second trial while one is already live', async () => {
    await request(app)
      .post(`/api/admin/companies/${company}/trial`)
      .set('Authorization', bearer(admin))
      .send({ plan_code: 'FEATURED', days: 3 })
      .expect(409);
  });
  it('lists trials for the executive dashboard', async () => {
    const r = await request(app)
      .get('/api/admin/trials')
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(r.body.data.some((t: { company_id: string }) => t.company_id === company)).toBe(true);
  });
  it('admin can cancel the trial at any time, reverting the plan immediately', async () => {
    const list = await request(app)
      .get('/api/admin/trials')
      .set('Authorization', bearer(admin))
      .expect(200);
    const trial = list.body.data.find((t: { company_id: string }) => t.company_id === company);
    await request(app)
      .post(`/api/admin/trials/${trial.id}/cancel`)
      .set('Authorization', bearer(other))
      .expect(403);
    await request(app)
      .post(`/api/admin/trials/${trial.id}/cancel`)
      .set('Authorization', bearer(admin))
      .expect(200);
    const after = await db.pg.query<{ code: string }>(
      'select code from plans where id=effective_plan($1)',
      [company],
    );
    expect(after.rows[0]!.code).toBe('FREE');
  });
  it('grants a new trial again after the previous one was canceled', async () => {
    await request(app)
      .post(`/api/admin/companies/${company}/trial`)
      .set('Authorization', bearer(admin))
      .send({ plan_code: 'FEATURED', days: 1 })
      .expect(201);
  });
});
