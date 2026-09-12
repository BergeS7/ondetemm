import type { Sql } from '../../shared/types/index.js';
export function findOwnedCompany(sql: Sql, values: unknown[] = []) {
  return sql.query(
    'select id from public.companies where owner_id=$1 and deleted_at is null limit 1',
    values,
  );
}
export function softDeleteCompany(sql: Sql, values: unknown[] = []) {
  return sql.query('select public.delete_company($1)', values);
}
export function submitCompany(sql: Sql, values: unknown[] = []) {
  return sql.query("select public.company_transition($1,'PENDING_APPROVAL',null)", values);
}
export function findPublishedCompany(sql: Sql, values: unknown[] = []) {
  return sql.query('select id from public.public_companies where id=$1', values);
}
