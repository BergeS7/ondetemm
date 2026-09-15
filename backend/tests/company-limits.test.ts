import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>, owner: Actor, city: string, state: string, category: string;
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
  };
}
beforeAll(async () => {
  await db.init();
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
describe('One company per owner', () => {
  it('blocks a second company for the same account with a clear message', async () => {
    await request(app)
      .post('/api/companies')
      .set('Authorization', bearer(owner))
      .send(payload('Primeira Empresa Do Dono'))
      .expect(201);
    const second = await request(app)
      .post('/api/companies')
      .set('Authorization', bearer(owner))
      .send(payload('Segunda Empresa Do Mesmo Dono'))
      .expect(409);
    expect(second.body.error.code).toBe('CONFLICT');
    expect(second.body.error.message).toMatch(/já possui uma empresa/i);
  });
});
