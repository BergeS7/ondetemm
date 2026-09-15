import { Router } from 'express';
import type { RequestHandler } from 'express';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
import type { NotificationService } from './notifications.service.js';
export function notificationRoutes(s: NotificationService, guard: RequestHandler) {
  const r = Router();
  // guard is applied per-route (not via router-level r.use(guard)) because this router
  // is mounted alongside others on the shared '/api' prefix — a path-less r.use() would
  // run for every request that reaches this router in the chain, not just /notifications
  // ones, incorrectly gating unrelated routes registered after it (e.g. the webhook).
  r.get(
    '/notifications',
    guard,
    controller((req) => s.list(actor(req), pagination.parse(req.query))),
  );
  r.get(
    '/notifications/unread-count',
    guard,
    controller((req) => s.unreadCount(actor(req))),
  );
  r.post(
    '/notifications/:id/read',
    guard,
    controller((req) => s.markRead(actor(req), param(req))),
  );
  r.post(
    '/notifications/read-all',
    guard,
    controller((req) => s.markAllRead(actor(req))),
  );
  return r;
}
