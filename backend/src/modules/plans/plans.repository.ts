import type { Sql, Page } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
export function listPlans(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select * from public.plans where is_active order by price_monthly,id',
    values,
    page,
  );
}
