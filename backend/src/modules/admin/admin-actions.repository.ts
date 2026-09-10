import type { Sql, Page } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function transitionCompany(sql: Sql, values: unknown[] = []) {
  return sql.query('select public.company_transition($1,$2::public.company_status,$3)', values);
}
export function findCompany(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.companies where id=$1', values);
}
export function listAnalytics(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    "select company_id,event_type,count(*)::int as count from public.interaction_events where created_at>now()-interval '30 days' group by company_id,event_type order by company_id,event_type",
    values,
    page,
  );
}
export function suspendProfile(sql: Sql, values: unknown[] = []) {
  return one(sql, "update public.profiles set status='SUSPENDED' where id=$1 returning id", values);
}
export function auditSuspension(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values($1,'USER_SUSPENDED','user',$2,$3)",
    values,
  );
}
