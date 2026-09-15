import * as queries from './events.repository.js';
import type { Actor, Database, Row } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import type { EventInput } from './analytics.schemas.js';
import { DeduplicationService } from './deduplication.service.js';
import { analyticsRepository } from './analytics.repository.js';
import { PlanService } from '../plans/plans.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
const fields: Record<string, string> = {
  PROFILE_VIEW: 'profileViews',
  WHATSAPP_CLICK: 'whatsappClicks',
  PHONE_CLICK: 'phoneClicks',
  ROUTE_CLICK: 'routeClicks',
  INSTAGRAM_CLICK: 'instagramClicks',
  WEBSITE_CLICK: 'websiteClicks',
  PROMOTION_CLICK: 'promotionClicks',
};
const empty = () => Object.fromEntries(Object.values(fields).map((k) => [k, 0]));
export class AnalyticsService {
  private dedup;
  constructor(
    private db: Database,
    private companies: CompanyService,
    secret: string,
  ) {
    this.dedup = new DeduplicationService(secret);
  }
  track(event: EventInput, ip: string, userAgent: string) {
    return this.db.run('system', async (s) => {
      const c = await queries.lockActiveCompany(s, [event.company_id]);
      if (!c.rows.length) throw new NotFoundError();
      if (event.event_type === 'PROMOTION_CLICK') {
        if (!event.metadata?.promotion_id) throw new ValidationError('promotion_id obrigatório');
        const p = await queries.findActivePromotion(s, [
          event.metadata.promotion_id,
          event.company_id,
        ]);
        if (!p.rows.length) throw new ValidationError('Promoção indisponível');
      }
      const ipHash = this.dedup.hash(ip),
        uaHash = this.dedup.hash(userAgent);
      if (await this.dedup.duplicate(s, event, ipHash, uaHash))
        return { accepted: true, counted: false };
      await queries.insertEvent(s, [
        event.company_id,
        event.event_type,
        event.session_id ?? null,
        ipHash,
        uaHash,
        JSON.stringify(event.metadata ?? {}),
      ]);
      return { accepted: true, counted: true };
    });
  }
  async dashboard(actor: Actor, id: string, period: string) {
    await this.companies.access(actor, id);
    const days = Number(period.slice(0, -1));
    return this.db.run('system', async (s) => {
      // Every active company keeps a 7-day baseline regardless of plan; longer
      // history windows require the plan's analytics_days entitlement.
      if (actor.role !== 'ADMIN')
        await new PlanService().require(s, id, 'analytics_days', days, 7);
      const result = await analyticsRepository.summary(s, id, days),
        totals = empty();
      for (const r of result.totals) {
        const key = fields[String(r.event_type)];
        if (key) totals[key] = Number(r.count);
      }
      const dates = new Map<string, Row>();
      for (const r of result.series) {
        const date = String(r.date);
        const day = dates.get(date) ?? { date, ...empty() };
        const key = fields[String(r.event_type)];
        if (key) day[key] = Number(r.count);
        dates.set(date, day);
      }
      return { ...totals, period, timezone: result.timezone, series: [...dates.values()] };
    });
  }
  publicSummary(id: string) {
    return this.db.run('system', async (sql) => {
      const result = await sql.query(
        `select count(e.id) filter (where e.event_type='PROFILE_VIEW')::int as "profileViews",
          count(e.id) filter (where e.event_type='WHATSAPP_CLICK')::int as "whatsappClicks",
          count(e.id) filter (where e.event_type='PHONE_CLICK')::int as "phoneClicks",
          count(e.id) filter (where e.event_type='INSTAGRAM_CLICK')::int as "instagramClicks"
         from public.companies c left join public.interaction_events e
           on e.company_id=c.id and e.created_at>=now()-interval '30 days'
         where c.id=$1 and c.status='ACTIVE' and c.deleted_at is null group by c.id`,
        [id],
      );
      if (!result.rows.length) throw new NotFoundError();
      return { ...result.rows[0], period: '30d' };
    });
  }
}

