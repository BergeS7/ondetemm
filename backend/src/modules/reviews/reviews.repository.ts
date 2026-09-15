import type { Page, Sql } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function upsertReview(sql: Sql, values: unknown[] = []) {
  // values: [company_id, user_id, rating, comment]
  return one(
    sql,
    `insert into public.reviews(company_id,user_id,rating,comment) values($1,$2,$3,$4)
     on conflict(company_id,user_id) do update set rating=excluded.rating,comment=excluded.comment
     returning *`,
    values,
  );
}
export function findReview(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.reviews where id=$1', values);
}
export function deleteReview(sql: Sql, values: unknown[] = []) {
  return sql.query('delete from public.reviews where id=$1', values);
}
export function listPublicReviews(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select id,company_id,rating,comment,created_at,user_id,reviewer_name,owner_reply,owner_reply_at from public.public_reviews where company_id=$1 order by created_at desc',
    values,
    page,
  );
}
export function findOwnReview(sql: Sql, values: unknown[] = []) {
  return sql.query('select * from public.reviews where company_id=$1 and user_id=$2', values);
}
export function replyToReview(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.reply_to_review($1,$2)', values);
}
