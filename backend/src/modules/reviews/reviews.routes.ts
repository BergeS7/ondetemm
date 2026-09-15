import { Router } from 'express';
import type { RequestHandler } from 'express';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination, id } from '../../shared/utils/validation.js';
import { reviewSchema } from './reviews.schemas.js';
import type { ReviewService } from './reviews.service.js';
export function reviewRoutes(s: ReviewService, guard: RequestHandler) {
  const r = Router();
  r.get(
    '/companies/:id/reviews',
    controller((req) => s.list(id.parse(param(req)), pagination.parse(req.query))),
  );
  r.get(
    '/companies/:id/reviews/mine',
    guard,
    controller((req) => s.mine(actor(req), id.parse(param(req)))),
  );
  r.post(
    '/companies/:id/reviews',
    guard,
    controller((req) => s.submit(actor(req), id.parse(param(req)), reviewSchema.parse(req.body)), 201),
  );
  r.delete(
    '/reviews/:id',
    guard,
    controller((req) => s.remove(actor(req), param(req))),
  );
  return r;
}
