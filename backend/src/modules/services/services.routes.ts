import { Router } from 'express';
import type { RequestHandler } from 'express';
import { ResourceService } from '../../shared/resource.service.js';
import type { Database } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
import { serviceSchema, servicePatch } from './services.schemas.js';
export function serviceRoutes(db: Database, companies: CompanyService, guard: RequestHandler) {
  const r = Router(),
    s = new ResourceService(db, companies, 'company_services', serviceSchema);
  r.post(
    '/companies/:companyId/services',
    guard,
    controller((req) => s.create(actor(req), param(req, 'companyId'), req.body), 201),
  );
  r.get(
    '/companies/:companyId/services',
    controller((req) => s.list(undefined, param(req, 'companyId'), pagination.parse(req.query))),
  );
  r.get(
    '/me/companies/:companyId/services',
    guard,
    controller((req) => s.list(actor(req), param(req, 'companyId'), pagination.parse(req.query))),
  );
  r.patch(
    '/services/:id',
    guard,
    controller((req) => s.patch(actor(req), param(req), servicePatch.parse(req.body))),
  );
  r.delete(
    '/services/:id',
    guard,
    controller((req) => s.remove(actor(req), param(req))),
  );
  return r;
}
