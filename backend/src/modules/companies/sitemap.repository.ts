import type { Row, Sql } from '../../shared/types/index.js';
interface SitemapRow extends Row {
  state_code: string;
  city_slug: string;
  slug: string;
  updated_at: string;
}
export function listPublishedCompanies(sql: Sql) {
  return sql.query<SitemapRow>(
    'select state_code,city_slug,slug,updated_at from public.public_companies order by updated_at desc',
  );
}
