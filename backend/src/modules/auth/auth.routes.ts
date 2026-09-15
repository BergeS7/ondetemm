import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthGateway } from './auth.service.js';
import type { Database } from '../../shared/types/index.js';
import { authController } from './auth.controller.js';
export function authRoutes(
  auth: AuthGateway,
  db: Database,
  guard: RequestHandler,
  limiter: RequestHandler,
  loginLimiter: RequestHandler = limiter,
) {
  const r = Router(),
    c = authController(auth, db);
  r.post('/register', limiter, c.register);
  // Credential stuffing / brute force is the highest-value target on this endpoint, so it
  // gets its own tighter budget instead of sharing one with register/refresh/forgot-password.
  r.post('/login', loginLimiter, c.login);
  r.post('/forgot-password', limiter, c.forgot);
  r.post('/refresh', limiter, c.refresh);
  r.post('/logout', guard, c.logout);
  r.post('/reset-password', limiter, guard, c.reset);
  r.get('/me', guard, c.me);
  return r;
}
