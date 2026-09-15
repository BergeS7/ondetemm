import type { Page, Sql } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export const adminRepository = {
  companies: (s: Sql, p: Page, status?: string) =>
    paged(
      s,
      'select * from public.companies where deleted_at is null and ($1::text is null or status::text=$1) order by created_at desc,id',
      [status ?? null],
      p,
    ),
  list: (s: Sql, table: 'profiles' | 'plans' | 'subscriptions' | 'admin_audit_logs', p: Page) =>
    paged(s, `select * from public.${table} order by created_at desc,id`, [], p),
  dashboard: (s: Sql) =>
    one(
      s,
      `select
        (select count(*)::int from public.companies where deleted_at is null) as companies,
        (select count(*)::int from public.companies where status='PENDING_APPROVAL' and deleted_at is null) as pending,
        (select count(*)::int from public.profiles) as users,
        (select count(*)::int from public.subscriptions where status='ACTIVE' and current_period_end>now()) as active_subscriptions,
        (select count(*)::int from public.subscriptions where provider='ADMIN_TRIAL' and status='ACTIVE' and current_period_end>now()) as active_trials,
        (select count(*)::int from public.companies where deleted_at is null and created_at>=now()-interval '7 days') as new_companies_7d,
        (select count(*)::int from public.company_claims where status='PENDING') as pending_claims,
        (select coalesce(sum(amount),0)::float from public.payments where status='approved' and paid_at>=date_trunc('month',now())) as revenue_this_month,
        (select coalesce(jsonb_object_agg(code,total),'{}'::jsonb) from (
          select p.code,count(*)::int as total from public.companies c
          join public.plans p on p.id=public.effective_plan(c.id)
          where c.deleted_at is null group by p.code
        ) plan_counts) as companies_by_plan`,
    ),
  trials: (s: Sql, p: Page) =>
    paged(
      s,
      `select s.id,s.company_id,c.name as company_name,pl.code as plan_code,pl.name as plan_name,
        s.current_period_start,s.current_period_end,s.status
       from public.subscriptions s
       join public.companies c on c.id=s.company_id
       join public.plans pl on pl.id=s.plan_id
       where s.provider='ADMIN_TRIAL'
       order by s.created_at desc,s.id`,
      [],
      p,
    ),
};
