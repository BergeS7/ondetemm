import type { Sql } from '../../shared/types/index.js';
import { one } from '../../shared/utils/repository.js';
export function recordEvent(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'insert into public.payment_events(provider,event_id,event_type,payload) values($1,$2,$3,$4) on conflict(event_id) do nothing',
    values,
  );
}
export function lockEvent(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.payment_events where event_id=$1 for update', values);
}
export function linkSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.subscriptions set provider_subscription_id=$2 where id=$1',
    values,
  );
}
export function markCanceled(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "update public.subscriptions set status='CANCELED',cancel_at_period_end=true where id=$1",
    values,
  );
}
export function markPastDue(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "update public.subscriptions set status='PAST_DUE' where id=$1 and status<>'CANCELED'",
    values,
  );
}
export function refreshCompanyPlan(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.companies set plan_id=public.effective_plan(id) where id=$1',
    values,
  );
}
export function linkPaymentSubscription(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'update public.subscriptions set provider_subscription_id=$2 where id=$1',
    values,
  );
}
export function markPaymentSubscriptionCanceled(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "update public.subscriptions set status='CANCELED',cancel_at_period_end=true where id=$1",
    values,
  );
}
export function upsertPayment(sql: Sql, values: unknown[] = []) {
  return sql.query(
    `insert into public.payments(company_id,subscription_id,provider,provider_payment_id,amount,currency,status,paid_at,period_start,period_end,provider_updated_at)
      values($1,$2,'MERCADO_PAGO',$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict(provider,provider_payment_id) do update set status=excluded.status,paid_at=excluded.paid_at,provider_updated_at=excluded.provider_updated_at
      where payments.subscription_id=excluded.subscription_id and payments.provider_updated_at<excluded.provider_updated_at returning id`,
    values,
  );
}
export function auditPlanChange(sql: Sql, values: unknown[] = []) {
  return sql.query(
    "insert into public.admin_audit_logs(action,entity_type,entity_id,metadata) values('PLAN_CHANGED','company',$1,$2)",
    values,
  );
}
export function markProcessed(sql: Sql, values: unknown[] = []) {
  return sql.query('update public.payment_events set processed_at=now() where event_id=$1', values);
}
