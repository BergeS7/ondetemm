import type { RequestHandler } from 'express';
import type { AuthGateway } from '../modules/auth/auth.service.js';
import type { Database, Role } from '../shared/types/index.js';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/index.js';
import { usersRepository } from '../modules/users/users.repository.js';
export function requireAuth(auth: AuthGateway, db: Database): RequestHandler {
  return async (req, _res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
    if (!match?.[1]) throw new UnauthorizedError();
    const token = match[1];
    const user = await auth.verify(token);
    const profile = await db.run('system', (sql) => usersRepository.get(sql, user.id));
    if (profile.status !== 'ACTIVE') throw new ForbiddenError('Conta suspensa');
    req.actor = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      token,
    };
    next();
  };
}
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.actor) throw new UnauthorizedError();
    if (!roles.includes(req.actor.role)) throw new ForbiddenError();
    next();
  };
}
