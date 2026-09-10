import type { Page, Sql } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
export interface Hour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}
export class HoursRepository {
  async replace(s: Sql, id: string, hours: Hour[]) {
    await s.query('select id from public.companies where id=$1 for update', [id]);
    await s.query('delete from public.company_hours where company_id=$1', [id]);
    for (const h of hours)
      await s.query(
        'insert into public.company_hours(company_id,day_of_week,opens_at,closes_at,is_closed) values($1,$2,$3,$4,$5)',
        [id, h.day_of_week, h.opens_at, h.closes_at, h.is_closed],
      );
    return { success: true };
  }
  list(s: Sql, id: string, p: Page) {
    return paged(
      s,
      'select * from public.company_hours where company_id=$1 order by day_of_week,opens_at,id',
      [id],
      p,
    );
  }
}
