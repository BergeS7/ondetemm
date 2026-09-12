import type { Page, Sql } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function createClaim(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.create_company_claim($1,$2)', values);
}
export function approveClaim(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.approve_company_claim($1)', values);
}
export function rejectClaim(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.reject_company_claim($1,$2)', values);
}
export function findClaim(sql: Sql, values: unknown[] = []) {
  return one(sql, 'select * from public.company_claims where id=$1', values);
}
export function listClaims(sql: Sql, page: Page, status?: string) {
  return paged(
    sql,
    `select cc.id,cc.company_id,cc.user_id,cc.message,cc.status,cc.rejection_reason,cc.created_at,cc.reviewed_at,cc.reviewed_by,
      c.name as company_name,c.slug as company_slug,p.name as claimant_name,p.email as claimant_email
     from public.company_claims cc
     join public.companies c on c.id=cc.company_id
     join public.profiles p on p.id=cc.user_id
     where ($1::text is null or cc.status=$1)
     order by cc.created_at desc,cc.id`,
    [status ?? null],
    page,
  );
}
