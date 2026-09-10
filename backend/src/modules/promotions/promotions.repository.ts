import type { Sql, Page } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
export function listPublicPromotions(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    `select p.*,c.name as company_name,c.slug as company_slug from public.promotions p join public.public_companies c on c.id=p.company_id where p.is_active and p.starts_at<=now() and p.ends_at>now() and ($1::text is null or lower(c.state_code)=lower($1)) and ($2::text is null or c.city_slug=$2) and ($3::text is null or exists(select 1 from public.company_categories cc join public.categories cat on cat.id=cc.category_id where cc.company_id=c.id and cat.slug=$3)) order by p.ends_at,p.id`,
    values,
    page,
  );
}
