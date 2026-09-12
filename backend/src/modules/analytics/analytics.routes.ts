import { Router } from 'express';
import type { RequestHandler } from 'express';
import { actor, controller, param } from '../../shared/utils/http.js';
import { eventSchema, analyticsQuery } from './analytics.schemas.js';
import type { AnalyticsService } from './analytics.service.js';
import { id } from '../../shared/utils/validation.js';
export function analyticsRoutes(
  s: AnalyticsService,
  guard: RequestHandler,
  limiter: RequestHandler,
) {
  const r = Router();
  r.get('/public/companies/:id/analytics', limiter,
    controller((req) => s.publicSummary(id.parse(param(req)))));
  r.post(
    '/events',
    limiter,
    controller(
      (req) =>
        s.track(eventSchema.parse(req.body), req.ip ?? 'unknown', req.get('user-agent') ?? ''),
      202,
    ),
  );
  r.get(
    '/companies/:id/analytics',
    guard,
    controller((req) =>
      s.dashboard(actor(req), param(req), analyticsQuery.parse(req.query).period),
    ),
  );
  return r;
}
