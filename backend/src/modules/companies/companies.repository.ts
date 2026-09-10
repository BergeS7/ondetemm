import type { Company, Page, Sql } from '../../shared/types/index.js';
import { one, insert, update, paged } from '../../shared/utils/repository.js';
export const companiesRepository = {
  get: (sql: Sql, id: string) =>
    one<Company>(sql, 'select c.*, array(select category_id from public.company_categories where company_id=c.id order by category_id) as category_ids from public.companies c where c.id=$1 and c.deleted_at is null', [id]),
  lock: (sql: Sql, id: string) =>
    one<Company>(
      sql,
      'select * from public.companies where id=$1 and deleted_at is null for update',
      [id],
    ),
  create: (sql: Sql, input: Record<string, unknown>) => insert(sql, 'companies', input),
  update: (sql: Sql, id: string, input: Record<string, unknown>) =>
    update(sql, 'companies', id, input),
  mine: (sql: Sql, owner: string, page: Page) =>
    paged(
      sql,
      'select * from public.companies where owner_id=$1 and deleted_at is null order by created_at desc,id',
      [owner],
      page,
    ),
  async categories(sql: Sql, company: string, ids: string[]) {
    await sql.query('delete from public.company_categories where company_id=$1', [company]);
    await sql.query(
      'insert into public.company_categories(company_id,category_id) select $1,unnest($2::uuid[])',
      [company, ids],
    );
  },
};
