import { loadConfig } from './config/env.js';
import { PgDatabase } from './config/database.js';
import { SupabaseAuthService } from './modules/auth/auth.service.js';
import { SupabaseImageStorage } from './modules/uploads/uploads.service.js';
import { createApp } from './app.js';
import pino from 'pino';
const config = loadConfig(),
  db = new PgDatabase(config),
  logger = pino({ level: config.LOG_LEVEL });
const app = createApp(config, {
  db,
  auth: new SupabaseAuthService(config),
  storage: new SupabaseImageStorage(config),
});
const server = app.listen(config.PORT, () =>
  logger.info({ port: config.PORT }, 'Onde Tem API listening'),
);
server.requestTimeout = 30000;
server.headersTimeout = 15000;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.close(() => {
      void db.close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
