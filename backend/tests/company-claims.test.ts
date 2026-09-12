import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase(),
  storage = new FakeStorage();
let app: ReturnType<typeof createApp>,
  owner: Actor,
  claimant: Actor,
  other: Actor,
  admin: Actor,
  city: string,
  state: string,
  category: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
async function makeUnclaimedCompany(name: string) {
  const created = await request(app)
    .post('/api/companies')
    .set('Authorization', bearer(owner))
    .send({
      name,
      short_description: 'Descrição curta',
      description: 'Descrição completa da empresa',
      state_id: state,
      city_id: city,
      street: 'Rua Central',
      whatsapp: '5598999999999',
      category_ids: [category],
    })
    .expect(201);
  const id = created.body.id as string;
  await request(app).post(`/api/companies/${id}/submit`).set('Authorization', bearer(owner)).expect(200);
  await request(app)
    .post(`/api/admin/companies/${id}/approve`)
    .set('Authorization', bearer(admin))
    .expect(200);
  // Simulate an unclaimed listing (owner_id is nullable per schema) via the service-role connection.
  await db.run('system', (s) => s.query('update public.companies set owner_id=null where id=$1', [id]));
  return id;
}
beforeAll(async () => {
  await db.init();
  owner = await db.user();
  claimant = await db.user();
  other = await db.user();
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
describe('Company claims (resgatar empresa)', () => {
  it('exposes is_claimed on the public profile', async () => {
    const id = await makeUnclaimedCompany('Restaurante Sem Dono');
    const slug = (
      await db.pg.query<{ slug: string }>('select slug from public.companies where id=$1', [id])
    ).rows[0]!.slug;
    const r = await request(app).get(`/api/public/ma/santa-ines/companies/${slug}`).expect(200);
    expect(r.body.company.is_claimed).toBe(false);
  });
  it('creates a claim for an unclaimed company', async () => {
    const id = await makeUnclaimedCompany('Padaria Disponível');
    const r = await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(claimant))
      .send({ message: 'Sou o proprietário, meu CNPJ é 12345678000199' })
      .expect(201);
    expect(r.body.status).toBe('PENDING');
    expect(r.body.company_id).toBe(id);
    expect(r.body.user_id).toBe(claimant.id);
  });
  it('blocks a duplicate pending claim from the same user', async () => {
    const id = await makeUnclaimedCompany('Loja Duplicada');
    await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(claimant))
      .send({})
      .expect(201);
    await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(claimant))
      .send({})
      .expect(400);
  });
  it('blocks a claim on an already-owned company', async () => {
    const created = await request(app)
      .post('/api/companies')
      .set('Authorization', bearer(owner))
      .send({
        name: 'Empresa Com Dono',
        short_description: 'Descrição curta',
        description: 'Descrição completa da empresa',
        state_id: state,
        city_id: city,
        street: 'Rua Central',
        whatsapp: '5598999999999',
        category_ids: [category],
      })
      .expect(201);
    const id = created.body.id as string;
    await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(claimant))
      .send({})
      .expect(400);
  });
  it('requires authentication to submit a claim', async () => {
    const id = await makeUnclaimedCompany('Serviço Anônimo');
    await request(app).post(`/api/companies/${id}/claim`).send({}).expect(401);
  });
  it('lists pending claims for admins only and rejects other roles', async () => {
    await request(app).get('/api/admin/company-claims').set('Authorization', bearer(owner)).expect(403);
    const r = await request(app)
      .get('/api/admin/company-claims?status=PENDING')
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(r.body.data.length).toBeGreaterThan(0);
    expect(r.body.data[0].company_name).toBeTruthy();
    expect(r.body.data[0].claimant_email).toBeTruthy();
  });
  it('admin approval sets the company owner_id and marks the claim approved', async () => {
    const id = await makeUnclaimedCompany('Oficina a Resgatar');
    const claim = await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(claimant))
      .send({ message: 'Prova de propriedade' })
      .expect(201);
    const approved = await request(app)
      .post(`/api/admin/company-claims/${claim.body.id}/approve`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(approved.body.owner_id).toBe(claimant.id);
    const row = await db.pg.query<{ owner_id: string }>(
      'select owner_id from public.companies where id=$1',
      [id],
    );
    expect(row.rows[0]!.owner_id).toBe(claimant.id);
    await request(app)
      .post(`/api/admin/company-claims/${claim.body.id}/approve`)
      .set('Authorization', bearer(admin))
      .expect(400);
  });
  it('admin rejection records a reason without changing ownership', async () => {
    const id = await makeUnclaimedCompany('Salão a Rejeitar');
    const claim = await request(app)
      .post(`/api/companies/${id}/claim`)
      .set('Authorization', bearer(other))
      .send({})
      .expect(201);
    const rejected = await request(app)
      .post(`/api/admin/company-claims/${claim.body.id}/reject`)
      .set('Authorization', bearer(admin))
      .send({ reason: 'Não foi possível confirmar a propriedade' })
      .expect(200);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.rejection_reason).toBe('Não foi possível confirmar a propriedade');
    const row = await db.pg.query<{ owner_id: string | null }>(
      'select owner_id from public.companies where id=$1',
      [id],
    );
    expect(row.rows[0]!.owner_id).toBeNull();
  });
});
