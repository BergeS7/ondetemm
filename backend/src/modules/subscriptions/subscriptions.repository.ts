import type { Sql } from '../../shared/types/index.js';
import { one } from '../../shared/utils/repository.js';
export const subscriptionsRepository = {
  lock: (s: Sql, id: string) =>
    one(s, 'select * from public.subscriptions where id=$1 for update', [id]),
  byProvider: (s: Sql, id: string) =>
    one(s, 'select * from public.subscriptions where provider_subscription_id=$1 for update', [id]),
  async refreshEntitlements(s: Sql, id: string) {
    const subscription = await one(s, 'select * from public.subscriptions where id=$1 for update', [
      id,
    ]);
    const latest = (
      await s.query(
        "select period_start,period_end from public.payments where subscription_id=$1 and status='approved' and period_end>now() order by period_end desc limit 1",
        [id],
      )
    ).rows[0];
    const status = subscription.status === 'CANCELED' ? 'CANCELED' : latest ? 'ACTIVE' : 'PAST_DUE';
    await s.query(
      'update public.subscriptions set status=$2,current_period_start=$3,current_period_end=$4 where id=$1',
      [id, status, latest?.period_start ?? null, latest?.period_end ?? null],
    );
    await s.query('update public.companies set plan_id=public.effective_plan(id) where id=$1', [
      subscription.company_id,
    ]);
  },
};
