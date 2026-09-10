import type { Page, Sql } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
export const locationsRepository = {
  states: (s: Sql, p: Page) =>
    paged(s, 'select id,name,code,country_id from public.states order by name,id', [], p),
  cities: (s: Sql, state: string, p: Page) =>
    paged(
      s,
      'select * from public.cities where state_id=$1 and is_active order by name,id',
      [state],
      p,
    ),
  neighborhoods: (s: Sql, city: string, p: Page) =>
    paged(s, 'select * from public.neighborhoods where city_id=$1 order by name,id', [city], p),
  search: (s: Sql, q: string, p: Page) =>
    paged(
      s,
      'select c.*,s.code as state_code from public.cities c join public.states s on s.id=c.state_id where c.is_active and (c.name ilike $1 or c.slug ilike $1) order by c.name,c.id',
      [`%${q}%`],
      p,
    ),
};
