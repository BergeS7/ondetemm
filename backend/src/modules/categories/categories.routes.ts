import * as queries from './categories.repository.js';
import { Router } from 'express';
import type { Database } from '../../shared/types/index.js';
import { controller } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
export function categoryRoutes(db: Database) {
  const r = Router();
  r.get(
    '/categories',
    controller((req) =>
      db.run(undefined, (s) => queries.listCategories(s, [], pagination.parse(req.query))),
    ),
  );
  return r;
}
