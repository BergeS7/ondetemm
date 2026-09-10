import type { Sql } from '../../shared/types/index.js';
import { one } from '../../shared/utils/repository.js';
export function findEffectivePlan(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.plans where id=public.effective_plan($1)', values);
}
