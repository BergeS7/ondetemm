import type { Sql, Page } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
export function listCategories(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select * from public.categories where is_active order by name,id',
    values,
    page,
  );
}
