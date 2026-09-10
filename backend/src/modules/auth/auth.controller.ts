import { z } from 'zod';
import type { AuthGateway } from './auth.service.js';
import type { Database } from '../../shared/types/index.js';
import { controller, actor } from '../../shared/utils/http.js';
import { credentials, registerSchema, forgotSchema, resetSchema } from './auth.schemas.js';
import { usersRepository } from '../users/users.repository.js';
export function authController(auth: AuthGateway, db: Database) {
  return {
    register: controller((req) => auth.register(registerSchema.parse(req.body)), 201),
    login: controller((req) => auth.login(credentials.parse(req.body))),
    logout: controller(async (req) => {
      await auth.logout(actor(req).token);
      return { success: true };
    }),
    forgot: controller(async (req) => {
      await auth.forgot(forgotSchema.parse(req.body).email);
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };
    }),
    reset: controller(async (req) => {
      await auth.reset(actor(req).token, resetSchema.parse(req.body).password);
      return { success: true };
    }),
    refresh: controller((req) =>
      auth.refresh(
        z
          .object({ refresh_token: z.string().min(1).max(4096) })
          .strict()
          .parse(req.body).refresh_token,
      ),
    ),
    me: controller((req) => db.run(actor(req), (sql) => usersRepository.get(sql, actor(req).id))),
  };
}
