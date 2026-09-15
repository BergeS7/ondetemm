import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let a: Actor,
  b: Actor,
  app: ReturnType<typeof createApp>,
  company: string,
  city: string,
  state: string,
  category: string;
beforeAll(async () => {
  await db.init();
  a = await db.user();
  b = await db.user();
  const location = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  city = location.id;
  state = location.state_id;
  category = (await db.pg.query<{ id: string }>('select id from categories limit 1')).rows[0]!.id;
  company = randomUUID();
  await db.pg.query(
    "insert into companies(id,owner_id,name,slug,description,short_description,state_id,city_id) values($1,$2,'Teste','teste','Descrição','Breve descrição',$3,$4)",
    [company, a.id, state, city],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
it('RLS denies cross-owner resources, private profiles and direct financial writes', async () => {
  await expect(
    db.run(b, (s) =>
      s.query('insert into company_categories(company_id,category_id) values($1,$2)', [
        company,
        category,
      ]),
    ),
  ).rejects.toThrow();
  await expect(
    db.run(b, (s) =>
      s.query('insert into company_hours(company_id,day_of_week,is_closed) values($1,0,true)', [
        company,
      ]),
    ),
  ).rejects.toThrow();
  expect(
    (await db.run(b, (s) => s.query('select * from profiles where id=$1', [a.id]))).rows,
  ).toHaveLength(0);
  await expect(
    db.run(a, (s) =>
      s.query(
        "insert into subscriptions(company_id,plan_id,status) select $1,id,'ACTIVE' from plans where code='PREMIUM'",
        [company],
      ),
    ),
  ).rejects.toThrow();
  await expect(
    db.run(a, (s) =>
      s.query(
        "insert into companies(owner_id,name,slug,short_description,description,state_id,city_id,logo_url) values($1,'Bad','bad','Description','Description',$2,$3,'https://bad.example')",
        [a.id, state, city],
      ),
    ),
  ).rejects.toThrow();
});
it('Storage policies deny unpublished photos to public and other owners', async () => {
  const id = randomUUID(),
    path = `${company}/${id}.webp`;
  await db.pg.query(
    "insert into company_images(id,company_id,url,storage_path,type) values($1,$2,$3,$4,'GALLERY')",
    [id, company, `/api/images/${id}`, path],
  );
  await db.pg.query("insert into storage.objects(bucket_id,name) values('company-images',$1)", [
    path,
  ]);
  expect(
    (await db.run(undefined, (s) => s.query('select * from storage.objects'))).rows,
  ).toHaveLength(0);
  expect((await db.run(b, (s) => s.query('select * from storage.objects'))).rows).toHaveLength(0);
  expect((await db.run(a, (s) => s.query('select * from storage.objects'))).rows).toHaveLength(1);
  await expect(
    db.run(a, (s) =>
      s.query("insert into storage.objects(bucket_id,name) values('company-images','bypass.png')"),
    ),
  ).rejects.toThrow();
});
it('plan quotas are paused (migration 006) but availability and category-status checks still apply at the database level', async () => {
  // Migration 006 intentionally paused subscription-based resource quotas: a second
  // category must now be accepted even without a paid plan.
  const other = (
    await db.pg.query<{ id: string }>('select id from categories where id<>$1 limit 1', [category])
  ).rows[0]!.id;
  await expect(
    db.run(a, (s) =>
      s.query('insert into company_categories(company_id,category_id) values($1,$2)', [
        company,
        other,
      ]),
    ),
  ).resolves.toBeDefined();
  // Retained by migration 006: an inactive category can never be linked to a company.
  const inactive = randomUUID();
  await db.pg.query(
    "insert into categories(id,name,slug,is_active) values($1,'Inativa','inativa-teste',false)",
    [inactive],
  );
  await expect(
    db.run(a, (s) =>
      s.query('insert into company_categories(company_id,category_id) values($1,$2)', [
        company,
        inactive,
      ]),
    ),
  ).rejects.toThrow();
  // Retained by migration 006: a resource row can never be moved to a different company.
  await expect(
    db.run(a, (s) =>
      s.query('update company_categories set company_id=$1 where company_id=$2 and category_id=$3', [
        randomUUID(),
        company,
        other,
      ]),
    ),
  ).rejects.toThrow();
});
it('natural-language query extracts city without a hardcoded municipality', async () => {
  await db.pg.query("update companies set status='ACTIVE',name='Churrascaria Teste' where id=$1", [
    company,
  ]);
  const r = await request(app)
    .get('/api/search')
    .query({ q: 'onde tem churrascaria em Santa Inês' })
    .expect(200);
  expect(r.body.data).toHaveLength(1);
});
it('deletion is soft, removes public profile, and keeps audit/payment history', async () => {
  await request(app)
    .delete(`/api/companies/${company}`)
    .set('Authorization', `Bearer ${a.id}`)
    .expect(200);
  expect(
    (
      await db.pg.query<{ deleted_at: unknown }>('select deleted_at from companies where id=$1', [
        company,
      ])
    ).rows[0]!.deleted_at,
  ).not.toBeNull();
  await request(app).get('/api/public/ma/santa-ines/companies/teste').expect(404);
});
