import type { Sql } from '../../shared/types/index.js';
import { paged } from '../../shared/utils/repository.js';
import type { SearchQuery } from './search.schemas.js';
import { RankingService } from './ranking.service.js';
import { slugify } from '../../shared/utils/validation.js';
export class SearchRepository {
  async resolveLocation(sql: Sql, name: string, state?: string) {
    return (
      await sql.query(
        'select c.slug,s.code from public.cities c join public.states s on s.id=c.state_id where c.is_active and c.slug=$1 and ($2::text is null or lower(s.code)=lower($2)) limit 2',
        [slugify(name), state ?? null],
      )
    ).rows;
  }
  search(sql: Sql, q: SearchQuery) {
    return paged(
      sql,
      `select c.id,c.name,c.slug,c.short_description,c.city_slug,c.city_name,c.state_code,c.neighborhood,c.phone,c.whatsapp,c.logo_url,c.cover_url,c.average_rating,c.reviews_count,c.verified,c.is_open,c.plan_code,c.is_sponsored,
 ${RankingService.expression} as ranking_score,
 case when $1='' then 0 else ts_rank(to_tsvector('portuguese',c.name||' '||c.description||' '||coalesce(c.neighborhood,'')),plainto_tsquery('portuguese',$1)) end as relevance
 from public.public_companies c where ($1='' or c.name ilike $2 or c.description ilike $2 or coalesce(c.neighborhood,'') ilike $2 or array_to_string(c.keywords,' ') ilike $2 or to_tsvector('portuguese',c.name||' '||c.description) @@ plainto_tsquery('portuguese',$1)
 or exists(select 1 from public.company_categories cc join public.categories cat on cat.id=cc.category_id where cc.company_id=c.id and (cat.name ilike $2 or cat.slug ilike $2))
 or exists(select 1 from public.company_services srv where srv.company_id=c.id and srv.is_active and (srv.name ilike $2 or coalesce(srv.description,'') ilike $2)))
 and ($3::text is null or lower(c.state_code)=lower($3)) and ($4::text is null or c.city_slug=$4)
 and ($5::text is null or exists(select 1 from public.company_categories cc join public.categories cat on cat.id=cc.category_id where cc.company_id=c.id and cat.slug=$5))
 and ($6::text is null or c.neighborhood ilike $6) and (not $7::boolean or c.is_open)
 and (not $8::boolean or exists(select 1 from public.promotions p where p.company_id=c.id and p.is_active and p.starts_at<=now() and p.ends_at>now()))
 order by ${RankingService.order(q.sort)}`,
      [
        q.q ?? '',
        `%${q.q ?? ''}%`,
        q.state ?? null,
        q.city ?? null,
        q.category ?? null,
        q.neighborhood ? `%${q.neighborhood}%` : null,
        q.open_now ?? false,
        q.has_promotion ?? false,
      ],
      q,
    );
  }
}
