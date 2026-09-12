import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
import { companySchema, companyPatch, claimSchema } from './companies.schemas.js';
import type { CompanyService } from './companies.service.js';
export function companiesController(s: CompanyService) {
  return {
    create: controller((r) => s.create(actor(r), companySchema.parse(r.body)), 201),
    get: controller((r) => s.get(actor(r), param(r))),
    patch: controller((r) => s.patch(actor(r), param(r), companyPatch.parse(r.body))),
    remove: controller((r) => s.remove(actor(r), param(r))),
    submit: controller((r) => s.submit(actor(r), param(r))),
    mine: controller((r) => s.mine(actor(r), pagination.parse(r.query))),
    claim: controller(
      (r) => s.claim(actor(r), param(r), claimSchema.parse(r.body).message),
      201,
    ),
  };
}
