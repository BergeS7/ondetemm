import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../../shared/types/index.js';
import { controller, param } from '../../shared/utils/http.js';
import { pagination, text } from '../../shared/utils/validation.js';
import { locationsRepository as repo } from './locations.repository.js';
export function locationRoutes(db: Database) {
  const r = Router();
  r.get(
    '/states',
    controller((req) => db.run(undefined, (s) => repo.states(s, pagination.parse(req.query)))),
  );
  r.get(
    '/states/:stateId/cities',
    controller((req) =>
      db.run(undefined, (s) => repo.cities(s, param(req, 'stateId'), pagination.parse(req.query))),
    ),
  );
  r.get(
    '/cities/:cityId/neighborhoods',
    controller((req) =>
      db.run(undefined, (s) =>
        repo.neighborhoods(s, param(req, 'cityId'), pagination.parse(req.query)),
      ),
    ),
  );
  r.get(
    '/locations/search',
    controller((req) => {
      const q = pagination.extend({ q: text(100).min(1) }).parse(req.query);
      return db.run(undefined, (s) => repo.search(s, z.string().parse(q.q), q));
    }),
  );
  return r;
}
