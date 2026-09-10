import { Router } from 'express';
import { controller } from '../../shared/utils/http.js';
import { searchSchema } from './search.schemas.js';
import type { SearchService } from './search.service.js';
export function searchRoutes(s: SearchService) {
  const r = Router();
  r.get(
    '/search',
    controller((req) => s.search(searchSchema.parse(req.query))),
  );
  return r;
}
