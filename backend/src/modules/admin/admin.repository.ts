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
      `select (select count(*)::int from public.companies where deleted_at is null) as companies,(select count(*)::int from public.companies where status='PENDING_APPROVAL' and deleted_at is null) as pending,(select count(*)::int from public.profiles) as users,(select count(*)::int from public.subscriptions where status='ACTIVE' and current_period_end>now()) as active_subscriptions`,
    ),
};
