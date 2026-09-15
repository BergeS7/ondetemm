import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>, city: string, state: string;
beforeAll(async () => {
  await db.init();
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
describe('Sitemap', () => {
  it('lists only published companies with their canonical URL, excluding drafts and deleted ones', async () => {
    const category = (
      await db.pg.query<{ id: string }>("select id from categories where slug='churrascarias'")
    ).rows[0]!.id;
    const published = randomUUID(),
      draft = randomUUID(),
      deleted = randomUUID();
    await db.pg.query(
      "insert into companies(id,name,slug,description,short_description,state_id,city_id,status) values($1,'Publicada Sitemap','publicada-sitemap',$2,$2,$3,$4,'ACTIVE')",
      [published, 'Descrição', state, city],
    );
    await db.pg.query(
      'insert into company_categories(company_id,category_id) values($1,$2)',
      [published, category],
    );
    await db.pg.query(
      "insert into companies(id,name,slug,description,short_description,state_id,city_id,status) values($1,'Rascunho Sitemap','rascunho-sitemap',$2,$2,$3,$4,'DRAFT')",
      [draft, 'Descrição', state, city],
    );
    await db.pg.query(
      "insert into companies(id,name,slug,description,short_description,state_id,city_id,status,deleted_at) values($1,'Excluida Sitemap','excluida-sitemap',$2,$2,$3,$4,'ACTIVE',now())",
      [deleted, 'Descrição', state, city],
    );
    const r = await request(app).get('/api/sitemap.xml').expect(200);
    expect(r.headers['content-type']).toMatch(/application\/xml/);
    expect(r.text).toContain('/ma/santa-ines/publicada-sitemap');
    expect(r.text).not.toContain('rascunho-sitemap');
    expect(r.text).not.toContain('excluida-sitemap');
  });
});
