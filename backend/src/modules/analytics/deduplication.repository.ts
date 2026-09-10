import type { Sql } from '../../shared/types/index.js';
export function lockCompany(sql: Sql, values: unknown[] = []) {
  return sql.query('select id from public.companies where id=$1 for update', values);
}
export function findDuplicate(sql: Sql, values: unknown[] = []) {
  return sql.query(
    `select id from public.interaction_events where company_id=$1 and event_type=$2 and created_at>now()-make_interval(secs=>$3)
   and (($4::text is not null and session_id=$4) or (ip_hash=$5 and user_agent_hash=$6)) limit 1`,
    values,
  );
}
