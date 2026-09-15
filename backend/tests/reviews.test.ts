import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { TestDatabase, FakeAuth, FakeStorage, config } from './helpers.js';
import type { Actor } from '../src/shared/types/index.js';
const db = new TestDatabase();
let app: ReturnType<typeof createApp>,
  owner: Actor,
  reviewer: Actor,
  other: Actor,
  company: string;
const bearer = (u: Actor) => `Bearer ${u.token}`;
beforeAll(async () => {
  await db.init();
  owner = await db.user();
  reviewer = await db.user();
  other = await db.user();
  const city = (
    await db.pg.query<{ id: string; state_id: string }>(
      "select id,state_id from cities where slug='santa-ines'",
    )
  ).rows[0]!;
  company = randomUUID();
  await db.pg.query(
    "insert into companies(id,owner_id,name,slug,short_description,description,state_id,city_id,status) values($1,$2,'Empresa Avaliada','empresa-avaliada','Empresa teste','Descrição teste',$3,$4,'ACTIVE')",
    [company, owner.id, city.state_id, city.id],
  );
  app = createApp(config, { db, auth: new FakeAuth(db), storage: new FakeStorage() });
}, 60000);
afterAll(() => db.close());
describe('Reviews', () => {
  it('requires authentication to submit a review', async () => {
    await request(app)
      .post(`/api/companies/${company}/reviews`)
      .send({ rating: 5 })
      .expect(401);
  });
  it('blocks the owner from reviewing their own company', async () => {
    await request(app)
      .post(`/api/companies/${company}/reviews`)
      .set('Authorization', bearer(owner))
      .send({ rating: 5, comment: 'Ótimo!' })
      .expect(403);
  });
  it('accepts a review and updates the company aggregate rating', async () => {
    const r = await request(app)
      .post(`/api/companies/${company}/reviews`)
      .set('Authorization', bearer(reviewer))
      .send({ rating: 4, comment: 'Muito bom atendimento' })
      .expect(201);
    expect(r.body.rating).toBe(4);
    const c = await db.pg.query<{ average_rating: string; reviews_count: number }>(
      'select average_rating,reviews_count from companies where id=$1',
      [company],
    );
    expect(Number(c.rows[0]!.average_rating)).toBe(4);
    expect(c.rows[0]!.reviews_count).toBe(1);
  });
  it('resubmitting updates the same review instead of creating a duplicate', async () => {
    await request(app)
      .post(`/api/companies/${company}/reviews`)
      .set('Authorization', bearer(reviewer))
      .send({ rating: 2, comment: 'Revisei minha nota' })
      .expect(201);
    const list = await request(app).get(`/api/companies/${company}/reviews`).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].rating).toBe(2);
    const c = await db.pg.query<{ average_rating: string; reviews_count: number }>(
      'select average_rating,reviews_count from companies where id=$1',
      [company],
    );
    expect(Number(c.rows[0]!.average_rating)).toBe(2);
    expect(c.rows[0]!.reviews_count).toBe(1);
  });
  it('lists reviews publicly with the reviewer name but never their email', async () => {
    const list = await request(app).get(`/api/companies/${company}/reviews`).expect(200);
    expect(list.body.data[0].reviewer_name).toBeTruthy();
    expect(JSON.stringify(list.body.data[0])).not.toMatch(/@example\.com/);
  });
  it('lets the company owner reply, but not edit the rating/comment', async () => {
    const mine = await request(app)
      .get(`/api/companies/${company}/reviews/mine`)
      .set('Authorization', bearer(reviewer))
      .expect(200);
    await request(app)
      .post(`/api/reviews/${mine.body.id}/reply`)
      .set('Authorization', bearer(other))
      .send({ reply: 'Não sou o dono' })
      .expect(403);
    const replied = await request(app)
      .post(`/api/reviews/${mine.body.id}/reply`)
      .set('Authorization', bearer(owner))
      .send({ reply: 'Obrigado pela avaliação!' })
      .expect(200);
    expect(replied.body.owner_reply).toBe('Obrigado pela avaliação!');
    expect(replied.body.rating).toBe(2);
    const list = await request(app).get(`/api/companies/${company}/reviews`).expect(200);
    expect(list.body.data[0].owner_reply).toBe('Obrigado pela avaliação!');
  });
  it('blocks deleting someone else\'s review', async () => {
    const mine = await request(app)
      .get(`/api/companies/${company}/reviews/mine`)
      .set('Authorization', bearer(reviewer))
      .expect(200);
    await request(app)
      .delete(`/api/reviews/${mine.body.id}`)
      .set('Authorization', bearer(other))
      .expect(403);
  });
  it('the author can delete their own review, and it leaves the aggregate at zero', async () => {
    const mine = await request(app)
      .get(`/api/companies/${company}/reviews/mine`)
      .set('Authorization', bearer(reviewer))
      .expect(200);
    await request(app)
      .delete(`/api/reviews/${mine.body.id}`)
      .set('Authorization', bearer(reviewer))
      .expect(200);
    const c = await db.pg.query<{ average_rating: string; reviews_count: number }>(
      'select average_rating,reviews_count from companies where id=$1',
      [company],
    );
    expect(Number(c.rows[0]!.average_rating)).toBe(0);
    expect(c.rows[0]!.reviews_count).toBe(0);
  });
});
