import type { Page, Row, Sql } from './types/index.js';
import { one, insert, update, paged } from './utils/repository.js';
export class ResourceRepository {
  constructor(private table: 'company_services' | 'promotions') {}
  get(s: Sql, id: string) {
    return one(s, `select * from public.${this.table} where id=$1`, [id]);
  }
  create(s: Sql, input: Row) {
    return insert(s, this.table, input);
  }
  update(s: Sql, id: string, input: Row) {
    return update(s, this.table, id, input);
  }
  async remove(s: Sql, id: string) {
    await s.query(`delete from public.${this.table} where id=$1`, [id]);
    return { success: true };
  }
  list(s: Sql, company: string, p: Page) {
    return paged(
      s,
      `select * from public.${this.table} where company_id=$1 order by created_at desc,id`,
      [company],
      p,
    );
  }
}
