import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>, admin: Actor, owner: Actor, city: string, state: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
beforeAll(async () => {
  await db.init();
  admin = await db.user('ADMIN');
  owner = await db.user();
  const c = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  city = c.id;
  state = c.state_id;
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('In-app notifications', () => {
  it('the webhook route (no bearer token) still works — regression guard for router mounting', async () => {
    // notificationRoutes shares the '/api' prefix with the webhook route; a past bug had
    // it gate every request under that prefix instead of only /notifications ones.
    await request(app)
      .post('/api/webhooks/mercadopago?data.id=invoice-123')
      .send({ id: 'bad', type: 'subscription_authorized_payment', data: { id: 'invoice-123' } })
      .expect(401); // rejected for a bad signature, not for a missing bearer token
  });
  it('requires authentication', async () => {
    await request(app).get('/api/notifications').expect(401);
  });
  it('notifies the owner when their company is approved, and unread-count reflects it', async () => {
    const company = randomUUID();
    await db.pg.query(
      "insert into companies(id,owner_id,name,slug,short_description,description,state_id,city_id,whatsapp,street,status) values($1,$2,'Empresa Notificada','empresa-notificada','Descrição','Descrição',$3,$4,'5598999999999','Rua Central','PENDING_APPROVAL')",
      [company, owner.id, state, city],
    );
    const category = (
      await db.pg.query<{ id: string }>("select id from categories where slug='churrascarias'")
    ).rows[0]!.id;
    await db.pg.query('insert into company_categories(company_id,category_id) values($1,$2)', [
      company,
      category,
    ]);
    await request(app)
      .post(`/api/admin/companies/${company}/approve`)
      .set('Authorization', bearer(admin))
      .expect(200);
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(
      list.body.data.some((n: { type: string }) => n.type === 'COMPANY_APPROVED'),
    ).toBe(true);
    const unread = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(unread.body.count).toBeGreaterThan(0);
    const target = list.body.data.find((n: { type: string }) => n.type === 'COMPANY_APPROVED');
    await request(app)
      .post(`/api/notifications/${target.id}/read`)
      .set('Authorization', bearer(owner))
      .expect(200);
    const afterRead = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearer(owner))
      .expect(200);
    expect(
      afterRead.body.data.find((n: { id: string }) => n.id === target.id).read_at,
    ).toBeTruthy();
  });
  it('a user never sees another user\'s notifications', async () => {
    const other = await db.user();
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearer(other))
      .expect(200);
    expect(list.body.data).toHaveLength(0);
  });
});
