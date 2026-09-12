import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import type { Config } from './config/env.js';
import type { Database } from './shared/types/index.js';
import type { AuthGateway } from './modules/auth/auth.service.js';
import type { ImageStorage } from './modules/uploads/uploads.service.js';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { CompanyService } from './modules/companies/companies.service.js';
import { companyRoutes } from './modules/companies/companies.routes.js';
import { locationRoutes } from './modules/locations/locations.routes.js';
import { categoryRoutes } from './modules/categories/categories.routes.js';
import { planRoutes } from './modules/plans/plans.routes.js';
import { serviceRoutes } from './modules/services/services.routes.js';
import { promotionRoutes } from './modules/promotions/promotions.routes.js';
import { hoursRoutes } from './modules/hours/hours.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { SearchService } from './modules/search/search.service.js';
import { publicRoutes } from './modules/companies/public.routes.js';
import { PublicCompanyService } from './modules/companies/public.service.js';
import { sitemapRoutes } from './modules/companies/sitemap.routes.js';
import { SitemapService } from './modules/companies/sitemap.service.js';
import { uploadRoutes } from './modules/uploads/uploads.routes.js';
import { UploadService } from './modules/uploads/uploads.service.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { AnalyticsService } from './modules/analytics/analytics.service.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { AdminService } from './modules/admin/admin.service.js';
import { controller, actor } from './shared/utils/http.js';
import { usersRepository } from './modules/users/users.repository.js';
import { text, url } from './shared/utils/validation.js';
import { z } from 'zod';
import {
  MercadoPagoService,
  type PaymentGateway,
} from './modules/subscriptions/mercadopago.service.js';
import { SubscriptionService } from './modules/subscriptions/subscriptions.service.js';
import { WebhookService } from './modules/subscriptions/webhook.service.js';
import { subscriptionRoutes } from './modules/subscriptions/subscriptions.routes.js';
export interface Dependencies {
  db: Database;
  auth: AuthGateway;
  storage: ImageStorage;
  payments?: PaymentGateway;
}
export function createApp(config: Config, deps: Dependencies) {
  const app = express(),
    logger = pino({ level: config.LOG_LEVEL }),
    guard = requireAuth(deps.auth, deps.db);
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.use(helmet());
  const origins = config.CORS_ORIGINS.split(',').map((s) => s.trim());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  const limited = (limit: number, windowMs: number) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente mais tarde.' },
      },
    });
  app.use(limited(300, 60000));
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    const id = randomUUID(),
      start = Date.now();
    res.locals['requestId'] = id;
    res.set('X-Request-Id', id);
    res.on('finish', () =>
      logger.info(
        {
          requestId: id,
          method: req.method,
          status: res.statusCode,
          durationMs: Date.now() - start,
        },
        'request',
      ),
    );
    next();
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'onde-tem' }));
  app.get(
    '/ready',
    controller(() =>
      deps.db.run(undefined, async (s) => {
        await s.query('select 1');
        return { status: 'ready' };
      }),
    ),
  );
  const companies = new CompanyService(deps.db);
  app.use(
    '/api/auth',
    authRoutes(
      deps.auth,
      deps.db,
      guard,
      limited(config.NODE_ENV === 'test' ? 1000 : 15, 15 * 60000),
    ),
  );
  app.use(
    '/api',
    companyRoutes(companies, guard),
    locationRoutes(deps.db),
    categoryRoutes(deps.db),
    planRoutes(deps.db),
    serviceRoutes(deps.db, companies, guard),
    hoursRoutes(companies, guard),
    promotionRoutes(deps.db, companies, guard),
    searchRoutes(new SearchService(deps.db)),
    publicRoutes(new PublicCompanyService(deps.db, config.PUBLIC_SITE_URL)),
    sitemapRoutes(new SitemapService(deps.db, config.PUBLIC_SITE_URL)),
    uploadRoutes(new UploadService(deps.db, companies, deps.storage), guard),
    analyticsRoutes(
      new AnalyticsService(deps.db, companies, config.IP_HASH_SECRET),
      guard,
      limited(60, 60000),
    ),
  );
  app.patch(
    '/api/me',
    guard,
    controller((req) =>
      deps.db.run(actor(req), (s) =>
        usersRepository.update(
          s,
          actor(req).id,
          z
            .object({
              name: text(120).min(2).optional(),
              phone: text(20).nullable().optional(),
              avatar_url: url.nullable().optional(),
            })
            .strict()
            .parse(req.body),
        ),
      ),
    ),
  );
  app.use('/api/admin', adminRoutes(new AdminService(deps.db), guard));
  const provider = deps.payments ?? new MercadoPagoService(config.MERCADO_PAGO_ACCESS_TOKEN);
  app.use(
    '/api',
    subscriptionRoutes(
      new SubscriptionService(deps.db, companies, provider, config.FRONTEND_URL),
      new WebhookService(deps.db, provider),
      guard,
      config.MERCADO_PAGO_WEBHOOK_SECRET,
    ),
  );
  app.use((_req, res) =>
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Rota não encontrada',
        requestId: res.locals['requestId'] as string | undefined,
      },
    }),
  );
  app.use(errorHandler(logger));
  return app;
}
