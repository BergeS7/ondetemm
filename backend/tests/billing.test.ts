import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createHmac, randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
import type {
  PaymentGateway,
  ProviderSubscription,
  ConfirmedPayment,
} from '../src/modules/subscriptions/mercadopago.service.js';
class FakePayments implements PaymentGateway {
  remote: ProviderSubscription = {
    id: 'provider-123',
    external_reference: '',
    status: 'authorized',
    init_point: 'https://www.mercadopago.com.br/subscriptions/checkout',
    auto_recurring: { transaction_amount: 29.9, currency_id: 'BRL' },
  };
  charge: ConfirmedPayment = {
    id: 'charge-123',
    status: 'approved',
    amount: 29.9,
    currency: 'BRL',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    periodStart: new Date().toISOString(),
    subscription: this.remote,
  };
  calls = 0;
  fail = false;
  async create(input: { id: string }) {
    this.remote.external_reference = input.id;
    return this.remote;
  }
  async cancel(_id: string) {
    this.remote.status = 'cancelled';
  }
  async subscription(_id: string) {
    return this.remote;
  }
  async confirmedPayment(_type: string, _id: string) {
    this.calls++;
    if (this.fail) throw new Error('Provider unavailable');
    return this.charge;
  }
}
const db = new TestDatabase(),
  payments = new FakePayments();
let app: ReturnType<typeof createApp>,
  owner: Actor,
  other: Actor,
  company: string,
  subscription: string;
const auth = (a: Actor) => ({ Authorization: `Bearer ${a.token}` });
beforeAll(async () => {
  await db.init();
  owner = await db.user();
  other = await db.user();
  const city = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  company = randomUUID();
  await db.pg.query(
    "insert into companies(id,owner_id,name,slug,short_description,description,state_id,city_id,status) values($1,$2,'Empresa teste','empresa-teste','Empresa de teste','Descrição teste',$3,$4,'ACTIVE')",
    [company, owner.id, city.state_id, city.id],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage(), payments });
}, 60000);
afterAll(() => db.close());
function webhook(id: string, type = 'subscription_authorized_payment') {
  const ts = String(Date.now()),
    requestId = 'request-123',
    dataId = 'invoice-123';
  const signature = createHmac('sha256', config.MERCADO_PAGO_WEBHOOK_SECRET)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return request(app)
    .post(`/api/webhooks/mercadopago?data.id=${dataId}`)
    .set('x-request-id', requestId)
    .set('x-signature', `ts=${ts},v1=${signature}`)
    .send({ id, type, data: { id: dataId } });
}
describe('subscriptions, confirmed events, plans and promotions', () => {
  it('checkout creates only a pending reservation, without granting plan', async () => {
    const r = await request(app)
      .post(`/api/companies/${company}/subscriptions`)
      .set(auth(owner))
      .send({ plan_code: 'FEATURED' })
      .expect(201);
    subscription = r.body.id;
    expect(r.body.status).toBe('PENDING');
    const plan = (
      await db.pg.query<{ code: string }>('select code from plans where id=effective_plan($1)', [
        company,
      ])
    ).rows[0]!;
    expect(plan.code).toBe('FREE');
    await request(app)
      .post(`/api/companies/${company}/subscriptions`)
      .set(auth(other))
      .send({ plan_code: 'PREMIUM' })
      .expect(403);
  });
  it('webhook requires a valid signature', async () => {
    await request(app)
      .post('/api/webhooks/mercadopago?data.id=invoice-123')
      .send({ id: 'bad', type: 'subscription_authorized_payment', data: { id: 'invoice-123' } })
      .expect(401);
  });
  it('authorized subscription alone never grants paid entitlement', async () => {
    await webhook('preapproval-1', 'subscription_preapproval').expect(200);
    const p = (
      await db.pg.query<{ code: string }>('select code from plans where id=effective_plan($1)', [
        company,
      ])
    ).rows[0]!;
    expect(p.code).toBe('FREE');
  });
  it('provider-confirmed payment activates subscription and paid plan', async () => {
    await webhook('event-1').expect(200);
    const sub = (
      await db.pg.query<{ status: string }>('select status from subscriptions where id=$1', [
        subscription,
      ])
    ).rows[0]!;
    expect(sub.status).toBe('ACTIVE');
    const p = (
      await db.pg.query<{ code: string }>('select code from plans where id=effective_plan($1)', [
        company,
      ])
    ).rows[0]!;
    expect(p.code).toBe('FEATURED');
  });
  it('repeated webhook and duplicate payment do not duplicate payment or audit', async () => {
    const before = payments.calls;
    const r = await webhook('event-1').expect(200);
    expect(r.body.duplicate).toBe(true);
    expect(payments.calls).toBe(before);
    await webhook('different-event-same-payment').expect(200);
    expect((await db.pg.query('select id from payments')).rows).toHaveLength(1);
    expect(
      (await db.pg.query("select id from admin_audit_logs where action='PLAN_CHANGED'")).rows,
    ).toHaveLength(1);
  });
  it('paid plan allows services and caps analytics period', async () => {
    await request(app)
      .post(`/api/companies/${company}/services`)
      .set(auth(owner))
      .send({ name: 'Almoço completo', price: 29.9, price_type: 'FIXED' })
      .expect(201);
    const search = await request(app).get('/api/search?q=Almoço').expect(200);
    expect(search.body.data).toHaveLength(1);
    await request(app)
      .get(`/api/companies/${company}/analytics?period=30d`)
      .set(auth(owner))
      .expect(200);
    await request(app)
      .get(`/api/companies/${company}/analytics?period=90d`)
      .set(auth(owner))
      .expect(403);
  });
  it('expired promotions are excluded by API and RLS; updates validate merged dates', async () => {
    const expired = await request(app)
      .post(`/api/companies/${company}/promotions`)
      .set(auth(owner))
      .send({
        title: 'Oferta antiga',
        starts_at: '2020-01-01T00:00:00Z',
        ends_at: '2020-01-02T00:00:00Z',
      })
      .expect(201);
    await request(app)
      .patch(`/api/promotions/${expired.body.id}`)
      .set(auth(owner))
      .send({ starts_at: '2021-01-01T00:00:00Z' })
      .expect(400);
    const active = await request(app)
      .post(`/api/companies/${company}/promotions`)
      .set(auth(owner))
      .send({
        title: 'Oferta atual',
        starts_at: new Date(Date.now() - 60000).toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    const r = await request(app).get('/api/promotions?state=ma&city=santa-ines').expect(200);
    expect(r.body.data.map((v: { id: string }) => v.id)).toEqual([active.body.id]);
    expect(
      (
        await db.run(undefined, (s) =>
          s.query('select id from promotions where id=$1', [expired.body.id]),
        )
      ).rows,
    ).toHaveLength(0);
    await request(app).delete(`/api/promotions/${active.body.id}`).set(auth(other)).expect(403);
  });
  it('failed provider request leaves event retryable, wrong amount cannot grant', async () => {
    payments.fail = true;
    await webhook('retryable-event').expect(500);
    payments.fail = false;
    expect(
      (
        await db.pg.query<{ processed_at: null }>(
          "select processed_at from payment_events where event_id like '%retryable-event'",
        )
      ).rows[0]!.processed_at,
    ).toBeNull();
    await webhook('retryable-event').expect(200);
    payments.charge.amount = 1;
    await webhook('wrong-amount').expect(400);
    payments.charge.amount = 29.9;
  });
  it('refund revokes entitlement and replay of old payment does not restore it', async () => {
    const old = payments.charge.updatedAt;
    payments.charge.status = 'refunded';
    payments.charge.updatedAt = new Date(Date.now() + 1000).toISOString();
    await webhook('refund-event').expect(200);
    expect(
      (
        await db.pg.query<{ code: string }>('select code from plans where id=effective_plan($1)', [
          company,
        ])
      ).rows[0]!.code,
    ).toBe('FREE');
    payments.charge.status = 'approved';
    payments.charge.updatedAt = old;
    await webhook('old-snapshot').expect(200);
    expect(
      (
        await db.pg.query<{ code: string }>('select code from plans where id=effective_plan($1)', [
          company,
        ])
      ).rows[0]!.code,
    ).toBe('FREE');
  });
  it('owner cancellation goes through provider and unauthorized users cannot cancel', async () => {
    await request(app)
      .post(`/api/subscriptions/${subscription}/cancel`)
      .set(auth(other))
      .expect(403);
    await request(app)
      .post(`/api/subscriptions/${subscription}/cancel`)
      .set(auth(owner))
      .expect(200);
    expect(payments.remote.status).toBe('cancelled');
  });
});
