import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>,
  admin: Actor,
  owner: Actor,
  city: string,
  state: string,
  category: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
function payload(name: string) {
  return {
    name,
    short_description: 'Descrição curta',
    description: 'Descrição completa da empresa',
    state_id: state,
    city_id: city,
    street: 'Rua Central',
    whatsapp: '5598999999999',
    category_ids: [category],
    source: 'diretorio-comercial',
  };
}
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
  category = (
    await db.pg.query<{ id: string }>("select id from categories where slug='churrascarias'")
  ).rows[0]!.id;
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('Admin unclaimed-company creation (generic importer path)', () => {
  it('rejects non-admins', async () => {
    await request(app)
      .post('/api/admin/companies')
      .set('Authorization', bearer(owner))
      .send(payload('Loja Sem Permissão'))
      .expect(403);
  });
  it('holds new unclaimed companies for review instead of publishing them immediately', async () => {
    const created = await request(app)
      .post('/api/admin/companies')
      .set('Authorization', bearer(admin))
      .send(payload('Empresa Nova Para Revisão'))
      .expect(201);
    expect(created.body.status).toBe('PENDING_APPROVAL');
    expect(created.body.owner_id).toBeNull();
    // Not yet public: it must be approved first, like any other submission.
    await request(app)
      .get(`/api/public/ma/santa-ines/companies/${created.body.slug}`)
      .expect(404);
    await request(app)
      .post(`/api/admin/companies/${created.body.id}/approve`)
      .set('Authorization', bearer(admin))
      .expect(200);
    await request(app)
      .get(`/api/public/ma/santa-ines/companies/${created.body.slug}`)
      .expect(200);
  });
  it('records provenance in the audit log without ever storing credentials', async () => {
    const created = await request(app)
      .post('/api/admin/companies')
      .set('Authorization', bearer(admin))
      .send(payload('Empresa Com Origem Registrada'))
      .expect(201);
    const log = await db.pg.query<{ metadata: { source?: string; name?: string } }>(
      "select metadata from admin_audit_logs where action='COMPANY_CREATED_UNCLAIMED' and entity_id=$1",
      [created.body.id],
    );
    expect(log.rows[0]!.metadata.source).toBe('diretorio-comercial');
    expect(log.rows[0]!.metadata.name).toBe('Empresa Com Origem Registrada');
    expect(JSON.stringify(log.rows[0]!.metadata)).not.toMatch(/token|password|senha|key/i);
  });
  it('blocks a duplicate name in the same city, accent- and case-insensitively', async () => {
    await request(app)
      .post('/api/admin/companies')
      .set('Authorization', bearer(admin))
      .send(payload('Padaria Central'))
      .expect(201);
    const conflict = await request(app)
      .post('/api/admin/companies')
      .set('Authorization', bearer(admin))
      .send(payload('PADARIA   central')) // same name, different case/spacing
      .expect(409);
    expect(conflict.body.error.message).toMatch(/j[áa] existe/i);
  });
  it('serializes concurrent duplicate submissions so only one is created', async () => {
    const name = 'Oficina Concorrente';
    const [first, second] = await Promise.all([
      request(app).post('/api/admin/companies').set('Authorization', bearer(admin)).send(payload(name)),
      request(app).post('/api/admin/companies').set('Authorization', bearer(admin)).send(payload(name)),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const rows = await db.pg.query(
      "select id from companies where city_id=$1 and name=$2 and deleted_at is null",
      [city, name],
    );
    expect(rows.rows).toHaveLength(1);
  });
});
