import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { CompanyService } from './companies.service.js';
import { companiesController } from './companies.controller.js';
export function companyRoutes(s: CompanyService, guard: RequestHandler) {
  const r = Router(),
    c = companiesController(s);
  r.post('/companies', guard, c.create);
  r.get('/companies/:id', guard, c.get);
  r.patch('/companies/:id', guard, c.patch);
  r.delete('/companies/:id', guard, c.remove);
  r.post('/companies/:id/submit', guard, c.submit);
  r.get('/me/companies', guard, c.mine);
  return r;
}
