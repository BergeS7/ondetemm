import { Router } from 'express';
import { z } from 'zod';
import { controller } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
import type { PublicCompanyService } from './public.service.js';
export function publicRoutes(s: PublicCompanyService) {
  const r = Router();
  r.get(
    '/public/:state/:city/companies/:slug',
    controller((req) => {
      const p = z
        .object({
          state: z.string().length(2),
          city: z.string().max(150),
          slug: z.string().max(160),
        })
        .parse(req.params);
      return s.get(p.state, p.city, p.slug, pagination.parse(req.query));
    }),
  );
  return r;
}
