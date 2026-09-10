import type { Sql, Page } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function lockActiveCompany(sql: Sql, values: unknown[] = []) {
  return one(
    sql,
    "select id from public.companies where id=$1 and status='ACTIVE' and deleted_at is null for update",
    values,
  );
}
export function findLiveSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "select * from public.subscriptions where company_id=$1 and status in ('PENDING','ACTIVE','PAST_DUE')",
    values,
  );
}
export function findPaidPlan(sql: Sql, values: unknown[] = []) {
  return one(
    sql,
    "select * from public.plans where code=$1 and code<>'FREE' and is_active",
    values,
  );
}
export function reserveSubscription(sql: Sql, values: unknown[] = []) {
  return one(
    sql,
    'insert into public.subscriptions(id,company_id,plan_id,amount) values($1,$2,$3,$4) returning *',
    values,
  );
}
export function saveCheckout(sql: Sql, values: unknown[] = []) {
  return one(
    sql,
    'update public.subscriptions set provider_subscription_id=$2,checkout_url=$3 where id=$1 returning *',
    values,
  );
}
export function listSubscriptions(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select * from public.subscriptions where company_id=$1 order by created_at desc,id',
    values,
    page,
  );
}
export function findSubscription(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.subscriptions where id=$1', values);
}
export function cancelSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "update public.subscriptions set status='CANCELED',cancel_at_period_end=true where id=$1",
    values,
  );
}
export function refreshCompanyPlan(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.companies set plan_id=public.effective_plan(id) where id=$1',
    values,
  );
}
