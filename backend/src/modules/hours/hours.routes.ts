import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { CompanyService } from '../companies/companies.service.js';
import { HoursService, hoursSchema } from './hours.service.js';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
export function hoursRoutes(c: CompanyService, guard: RequestHandler) {
  const r = Router(),
    s = new HoursService(c);
  r.put(
    '/companies/:id/hours',
    guard,
    controller((req) => s.replace(actor(req), param(req), hoursSchema.parse(req.body))),
  );
  r.get(
    '/me/companies/:id/hours',
    guard,
    controller((req) => s.list(actor(req), param(req), pagination.parse(req.query))),
  );
  return r;
}
