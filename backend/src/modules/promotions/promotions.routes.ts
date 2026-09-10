import * as queries from './promotions.repository.js';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { ResourceService } from '../../shared/resource.service.js';
import type { Database } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination, text } from '../../shared/utils/validation.js';
import { promotionSchema, promotionPatch } from './promotions.schemas.js';
export function promotionRoutes(db: Database, companies: CompanyService, guard: RequestHandler) {
  const r = Router(),
    s = new ResourceService(db, companies, 'promotions', promotionSchema);
  r.post(
    '/companies/:id/promotions',
    guard,
    controller((req) => s.create(actor(req), param(req), req.body), 201),
  );
  r.get(
    '/companies/:id/promotions',
    controller((req) => s.list(undefined, param(req), pagination.parse(req.query))),
  );
  r.get(
    '/me/companies/:id/promotions',
    guard,
    controller((req) => s.list(actor(req), param(req), pagination.parse(req.query))),
  );
  r.patch(
    '/promotions/:id',
    guard,
    controller((req) => s.patch(actor(req), param(req), promotionPatch.parse(req.body))),
  );
  r.delete(
    '/promotions/:id',
    guard,
    controller((req) => s.remove(actor(req), param(req))),
  );
  r.get(
    '/promotions',
    controller((req) => {
      const q = pagination
        .extend({
          state: text(2).optional(),
          city: text(150).optional(),
          category: text(100).optional(),
        })
        .parse(req.query);
      return db.run(undefined, (sql) =>
        queries.listPublicPromotions(sql, [q.state ?? null, q.city ?? null, q.category ?? null], q),
      );
    }),
  );
  return r;
}
