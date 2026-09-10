import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { actor, controller, param } from '../../shared/utils/http.js';
import { pagination } from '../../shared/utils/validation.js';
import type { SubscriptionService } from './subscriptions.service.js';
import type { WebhookService } from './webhook.service.js';
import { verifyWebhook } from './webhook-signature.js';
import { ValidationError } from '../../shared/errors/index.js';
export function subscriptionRoutes(
  s: SubscriptionService,
  w: WebhookService,
  guard: RequestHandler,
  secret: string,
) {
  const r = Router();
  r.post(
    '/companies/:id/subscriptions',
    guard,
    controller(
      (req) =>
        s.create(
          actor(req),
          param(req),
          z
            .object({ plan_code: z.enum(['FEATURED', 'PREMIUM']) })
            .strict()
            .parse(req.body).plan_code,
        ),
      201,
    ),
  );
  r.get(
    '/companies/:id/subscriptions',
    guard,
    controller((req) => s.list(actor(req), param(req), pagination.parse(req.query))),
  );
  r.post(
    '/subscriptions/:id/cancel',
    guard,
    controller((req) => s.cancel(actor(req), param(req))),
  );
  r.post(
    '/webhooks/mercadopago',
    controller((req) => {
      const input = z
        .object({
          id: z.union([z.string(), z.number()]).transform(String),
          type: z.enum(['payment', 'subscription_preapproval', 'subscription_authorized_payment']),
          data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }),
        })
        .parse(req.body);
      const dataId = z.string().max(200).parse(req.query['data.id']);
      if (dataId !== input.data.id) throw new ValidationError('ID do webhook incompatível');
      verifyWebhook(secret, req.get('x-signature'), req.get('x-request-id'), dataId);
      return w.process(input);
    }),
  );
  return r;
}
