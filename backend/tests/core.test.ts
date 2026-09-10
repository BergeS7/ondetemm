import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase(),
  storage = new FakeStorage();
let app: ReturnType<typeof createApp>,
  a: Actor,
  b: Actor,
  admin: Actor,
  city: string,
  state: string,
  category: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
let companyId: string, slug: string;
beforeAll(async () => {
  await db.init();
  a = await db.user();
  b = await db.user();
  admin = await db.user('ADMIN');
  const c = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  city = c.id;
  state = c.state_id;
  category = (
    await db.pg.query<{ id: string }>("select id from categories where slug='churrascarias'")
  ).rows[0]!.id;
  app = createApp(config, { db, auth: new FakeAuth(db), storage });
}, 60000);
afterAll(() => db.close());
describe('Onde Tem core integration: Express + PostgreSQL/RLS', () => {
  it('register/login routes use Auth gateway and reject role escalation', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'new@example.com', password: 'test-password', role: 'ADMIN' })
      .expect(400);
    const r = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'new@example.com', password: 'test-password' })
      .expect(201);
    expect(r.body.user.id).toBeTruthy();
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'new@example.com', password: 'test-password' })
      .expect(200);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'new@example.com', password: 'wrong-password' })
      .expect(401);
    await request(app).get('/api/auth/me').expect(401);
  });
  it('creates a company and promotes USER to COMPANY_OWNER through DB trigger', async () => {
    const r = await request(app)
      .post('/api/companies')
      .set('Authorization', bearer(a))
      .send({
        name: 'Churrascaria do Zé',
        short_description: 'Churrasco em Santa Inês',
        description: 'Carnes e churrasco',
        state_id: state,
        city_id: city,
        street: 'Rua Central',
        whatsapp: '5598999999999',
        category_ids: [category],
      })
      .expect(201);
    companyId = r.body.id;
    slug = r.body.slug;
    expect(slug).toMatch(/^churrascaria-do-ze-/);
    const me = await request(app).get('/api/auth/me').set('Authorization', bearer(a)).expect(200);
    expect(me.body.role).toBe('COMPANY_OWNER');
  });
  it('Zod rejects protected fields and malformed IDs', async () => {
    await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', bearer(a))
      .send({ verified: true, plan_id: randomUUID() })
      .expect(400);
    await request(app).get('/api/companies/invalid').set('Authorization', bearer(a)).expect(400);
  });
  it('owner B cannot edit, read or delete owner A company', async () => {
    for (const method of ['get', 'patch', 'delete'] as const) {
      const client = request(app);
      const req = client[method](`/api/companies/${companyId}`).set('Authorization', bearer(b));
      if (method === 'patch') req.send({ name: 'Attack' });
      await req.expect(403);
    }
    await request(app)
      .patch(`/api/companies/${companyId}`)
      .set('Authorization', bearer(a))
      .send({ name: 'Churrascaria do Zé Atualizada' })
      .expect(200);
  });
  it('RLS independently prevents cross-owner reads and writes, and privilege changes', async () => {
    const rows = await db.run(b, (s) =>
      s.query('select * from companies where id=$1', [companyId]),
    );
    expect(rows.rows).toHaveLength(0);
    const edited = await db.run(b, (s) =>
      s.query('update companies set name=$2 where id=$1 returning id', [companyId, 'Attack']),
    );
    expect(edited.rows).toHaveLength(0);
    await expect(
      db.run(a, (s) => s.query("update profiles set role='ADMIN' where id=$1", [a.id])),
    ).rejects.toThrow();
    await expect(
      db.run(a, (s) => s.query("update companies set status='ACTIVE' where id=$1", [companyId])),
    ).rejects.toThrow();
  });
  it('USER cannot access admin and draft is not public', async () => {
    await request(app).get('/api/admin/dashboard').set('Authorization', bearer(b)).expect(403);
    await request(app).get(`/api/public/ma/santa-ines/companies/${slug}`).expect(404);
  });
  it('upload validates binary image, quotas and ownership', async () => {
    await request(app)
      .post(`/api/companies/${companyId}/images`)
      .set('Authorization', bearer(a))
      .field('type', 'LOGO')
      .attach('file', Buffer.from('<script>bad</script>'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
    const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    const uploaded = await request(app)
      .post(`/api/companies/${companyId}/images`)
      .set('Authorization', bearer(a))
      .field('type', 'LOGO')
      .attach('file', image, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);
    expect(uploaded.body.url).toMatch(/^\/api\/images\//);
    await request(app)
      .post(`/api/companies/${companyId}/images`)
      .set('Authorization', bearer(b))
      .field('type', 'GALLERY')
      .attach('file', image, { filename: 'photo.png', contentType: 'image/png' })
      .expect(403);
  });
  it('submission, rejection reason, resubmission and approval are audited', async () => {
    await request(app)
      .post(`/api/companies/${companyId}/submit`)
      .set('Authorization', bearer(a))
      .expect(200);
    await request(app)
      .post(`/api/admin/companies/${companyId}/reject`)
      .set('Authorization', bearer(admin))
      .send({ reason: 'Corrigir endereço' })
      .expect(200);
    await request(app).get(`/api/public/ma/santa-ines/companies/${slug}`).expect(404);
    const rejected = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', bearer(a))
      .expect(200);
    expect(rejected.body.rejection_reason).toBe('Corrigir endereço');
    await request(app)
      .post(`/api/companies/${companyId}/submit`)
      .set('Authorization', bearer(a))
      .expect(200);
    await request(app)
      .post(`/api/admin/companies/${companyId}/approve`)
      .set('Authorization', bearer(admin))
      .expect(200);
    const logs = await db.pg.query('select action from admin_audit_logs where entity_id=$1', [
      companyId,
    ]);
    expect(logs.rows).toHaveLength(2);
  });
  it('public profile includes SEO and never exposes internal fields', async () => {
    const r = await request(app).get(`/api/public/ma/santa-ines/companies/${slug}`).expect(200);
    expect(r.body.seo.title).toContain('Onde Tem');
    expect(r.body.company.owner_id).toBeUndefined();
    expect(r.body.company.cnpj).toBeUndefined();
    expect(r.body.company.rejection_reason).toBeUndefined();
    await expect(
      db.run(undefined, (s) => s.query('select owner_id from companies')),
    ).rejects.toThrow();
  });
  it('search and pagination are bounded and only active companies are found', async () => {
    const r = await request(app)
      .get('/api/search?q=churrascaria&state=ma&city=santa-ines&limit=1')
      .expect(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.pagination.total).toBe(1);
    await request(app).get('/api/search?limit=101').expect(400);
    await request(app).get('/api/search?page=0').expect(400);
    const empty = await request(app).get('/api/search?q=churrascaria&page=2&limit=1').expect(200);
    expect(empty.body.pagination.total).toBe(1);
    expect(empty.body.data).toHaveLength(0);
  });
  it('tracking deduplicates the sliding window and never stores raw IP', async () => {
    const body = { company_id: companyId, event_type: 'PROFILE_VIEW', session_id: randomUUID() };
    const first = await request(app).post('/api/events').send(body).expect(202);
    expect(first.body.counted).toBe(true);
    const second = await request(app).post('/api/events').send(body).expect(202);
    expect(second.body.counted).toBe(false);
    const changedSession = await request(app)
      .post('/api/events')
      .send({ ...body, session_id: randomUUID() })
      .expect(202);
    expect(changedSession.body.counted).toBe(false);
    await request(app)
      .post('/api/events')
      .send({ ...body, event_type: 'WHATSAPP_CLICK' })
      .expect(202);
    const e = (
      await db.pg.query<{ ip_hash: string }>('select ip_hash from interaction_events limit 1')
    ).rows[0]!;
    expect(e.ip_hash).toMatch(/^[a-f0-9]{64}$/);
    await request(app)
      .post('/api/events')
      .send({ ...body, event_type: 'FAKE' })
      .expect(400);
  });
  it('analytics rejects non-owner and free plan, admin can inspect', async () => {
    await request(app)
      .get(`/api/companies/${companyId}/analytics`)
      .set('Authorization', bearer(b))
      .expect(403);
    await request(app)
      .get(`/api/companies/${companyId}/analytics`)
      .set('Authorization', bearer(a))
      .expect(403);
    const r = await request(app)
      .get(`/api/companies/${companyId}/analytics`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(r.body.profileViews).toBe(1);
    expect(r.body.whatsappClicks).toBe(1);
  });
  it('free plan cannot insert services or promotions through API or SQL', async () => {
    await request(app)
      .post(`/api/companies/${companyId}/services`)
      .set('Authorization', bearer(a))
      .send({ name: 'Churrasco', price_type: 'CONTACT' })
      .expect(400);
    await expect(
      db.run(a, (s) =>
        s.query('insert into company_services(company_id,name) values($1,$2)', [
          companyId,
          'Bypass',
        ]),
      ),
    ).rejects.toThrow();
  });
  it('hours calculate overnight opening in city timezone', async () => {
    await request(app)
      .put(`/api/companies/${companyId}/hours`)
      .set('Authorization', bearer(a))
      .send({
        hours: [{ day_of_week: 1, opens_at: '22:00', closes_at: '02:00', is_closed: false }],
      })
      .expect(200);
    const r = await db.pg.query<{ open: boolean }>(
      "select company_open($1,'2026-09-08T04:00:00Z') as open",
      [companyId],
    );
    expect(r.rows[0]!.open).toBe(true);
  });
  it('suspended company disappears from public catalog and direct RLS reads', async () => {
    await request(app)
      .post(`/api/admin/companies/${companyId}/suspend`)
      .set('Authorization', bearer(admin))
      .expect(200);
    await request(app).get(`/api/public/ma/santa-ines/companies/${slug}`).expect(404);
    const r = await request(app).get('/api/search?q=churrascaria').expect(200);
    expect(r.body.data).toHaveLength(0);
    const direct = await db.run(undefined, (s) =>
      s.query('select * from company_hours where company_id=$1', [companyId]),
    );
    expect(direct.rows).toHaveLength(0);
  });
});
