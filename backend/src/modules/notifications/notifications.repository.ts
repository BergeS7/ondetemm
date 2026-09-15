import type { Page, Sql } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function listNotifications(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select id,type,title,body,entity_type,entity_id,read_at,created_at from public.notifications where user_id=$1 order by created_at desc',
    values,
    page,
  );
}
export function unreadCount(sql: Sql, values: unknown[] = []) {
  return one<{ count: number }>(
    sql,
    'select count(*)::int as count from public.notifications where user_id=$1 and read_at is null',
    values,
  );
}
export function markRead(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.notifications set read_at=now() where id=$1 and read_at is null',
    values,
  );
}
export function markAllRead(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.notifications set read_at=now() where user_id=$1 and read_at is null',
    values,
  );
}
