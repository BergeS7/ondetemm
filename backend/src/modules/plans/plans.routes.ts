import * as queries from './plans.repository.js';
import { Router } from 'express';
import type { Database } from '../../shared/types/index.js';
import { controller } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
export function planRoutes(db: Database) {
  const r = Router();
  r.get(
    '/plans',
    controller((req) =>
      db.run(undefined, (s) => queries.listPlans(s, [], pagination.parse(req.query))),
    ),
  );
  return r;
}
