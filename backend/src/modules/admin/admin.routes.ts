import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination, text } from '../../shared/utils/validation.js';
import { requireRole } from '../../middlewares/auth.js';
import type { AdminService } from './admin.service.js';
export function adminRoutes(s: AdminService, guard: RequestHandler) {
  const r = Router();
  r.use(guard, requireRole('ADMIN'));
  r.get(
    '/dashboard',
    controller((req) => s.dashboard(actor(req))),
  );
  r.get(
    '/companies/pending',
    controller((req) => s.companies(actor(req), pagination.parse(req.query), 'PENDING_APPROVAL')),
  );
  r.get(
    '/companies',
    controller((req) => {
      const q = pagination
        .extend({
          status: z
            .enum(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'])
            .optional(),
        })
        .parse(req.query);
      return s.companies(actor(req), q, q.status);
    }),
  );
  r.post(
    '/companies/:id/approve',
    controller((req) => s.moderate(actor(req), param(req), 'ACTIVE')),
  );
  r.post(
    '/companies/:id/reject',
    controller((req) =>
      s.moderate(
        actor(req),
        param(req),
        'REJECTED',
        z
          .object({ reason: text(1000).min(3) })
          .strict()
          .parse(req.body).reason,
      ),
    ),
  );
  r.post(
    '/companies/:id/suspend',
    controller((req) => s.moderate(actor(req), param(req), 'SUSPENDED')),
  );
  r.get(
    '/users',
    controller((req) => s.list(actor(req), 'profiles', pagination.parse(req.query))),
  );
  r.get(
    '/plans',
    controller((req) => s.list(actor(req), 'plans', pagination.parse(req.query))),
  );
  r.get(
    '/subscriptions',
    controller((req) => s.list(actor(req), 'subscriptions', pagination.parse(req.query))),
  );
  r.get(
    '/audit-logs',
    controller((req) => s.list(actor(req), 'admin_audit_logs', pagination.parse(req.query))),
  );
  r.get(
    '/analytics',
    controller((req) => s.analytics(actor(req), pagination.parse(req.query))),
  );
  r.post(
    '/users/:id/suspend',
    controller((req) =>
      s.suspendUser(
        actor(req),
        param(req),
        z
          .object({ reason: text(1000).min(3) })
          .strict()
          .parse(req.body).reason,
      ),
    ),
  );
  return r;
}
