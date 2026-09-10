import type { Sql } from '../../shared/types/index.js';
export function lockActiveCompany(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "select id from public.companies where id=$1 and status='ACTIVE' and deleted_at is null for update",
    values,
  );
}
export function findActivePromotion(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'select id from public.promotions where id=$1 and company_id=$2 and is_active and starts_at<=now() and ends_at>now()',
    values,
  );
}
export function insertEvent(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'insert into public.interaction_events(company_id,event_type,session_id,ip_hash,user_agent_hash,metadata) values($1,$2,$3,$4,$5,$6)',
    values,
  );
}
