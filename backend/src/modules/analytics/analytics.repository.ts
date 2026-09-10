import type { Sql } from '../../shared/types/index.js';
import { one } from '../../shared/utils/repository.js';
export const analyticsRepository = {
  async summary(s: Sql, id: string, days: number) {
    const totals = await s.query(
      'select event_type,count(*)::int as count from public.interaction_events where company_id=$1 and created_at>=now()-make_interval(days=>$2) group by event_type',
      [id, days],
    );
    const zone = await one(
      s,
      'select ci.timezone from public.companies c join public.cities ci on ci.id=c.city_id where c.id=$1',
      [id],
    );
    const series = await s.query(
      'select (created_at at time zone $3)::date::text as date,event_type,count(*)::int as count from public.interaction_events where company_id=$1 and created_at>=now()-make_interval(days=>$2) group by 1,event_type order by 1',
      [id, days, zone.timezone],
    );
    return { totals: totals.rows, series: series.rows, timezone: zone.timezone };
  },
};
