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
export function auditLog(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata) values($1,$2,$3,$4,$5)',
    values,
  );
}
export function lockCompanyForTrial(sql: Sql, values: unknown[] = []) {
  return one(sql, "select id from public.companies where id=$1 and deleted_at is null for update", values);
}
export function findLiveSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "select id from public.subscriptions where company_id=$1 and status in ('PENDING','ACTIVE','PAST_DUE')",
    values,
  );
}
export function findPaidPlan(sql: Sql, values: unknown[] = []) {
  return one(sql, "select * from public.plans where code=$1 and code<>'FREE' and is_active", values);
}
export function grantTrialSubscription(sql: Sql, values: unknown[] = []) {
  // values: [id, company_id, plan_id, days]
  return one(
    sql,
    `insert into public.subscriptions(id,company_id,plan_id,amount,provider,status,current_period_start,current_period_end)
     values($1,$2,$3,0,'ADMIN_TRIAL','ACTIVE',now(),now()+make_interval(days=>$4::int)) returning *`,
    values,
  );
}
export function findTrialSubscription(sql: Sql, values: unknown[] = []) {
  return one(sql, "select * from public.subscriptions where id=$1 and provider='ADMIN_TRIAL'", values);
}
export function cancelTrialSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "update public.subscriptions set status='CANCELED',current_period_end=now() where id=$1",
    values,
  );
}
export function refreshCompanyPlan(sql: Sql, values: unknown[] = []) {
  return sql.query('update public.companies set plan_id=public.effective_plan(id) where id=$1', values);
}
