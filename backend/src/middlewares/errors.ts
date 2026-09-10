import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/index.js';
export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error: unknown, _req, res, _next) => {
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'Erro interno do servidor';
    if (error instanceof AppError) {
      ({ status, code, message } = error);
    } else if (error instanceof ZodError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } else if (typeof error === 'object' && error) {
      const e = error as { code?: string; type?: string; status?: number };
      if (e.code === '23505') {
        status = 409;
        code = 'CONFLICT';
        message = 'Registro já existe';
      } else if (e.code === '42501') {
        status = 403;
        code = 'FORBIDDEN';
        message = 'Acesso não permitido';
      } else if (['23514', '23503', '22P02'].includes(e.code ?? '')) {
        status = 400;
        code = 'VALIDATION_ERROR';
        message = 'Dados ou limites do plano inválidos';
      } else if (e.code === 'P0002') {
        status = 404;
        code = 'NOT_FOUND';
        message = 'Registro não encontrado';
      } else if (e.code === 'LIMIT_FILE_SIZE' || e.type === 'entity.too.large') {
        status = 413;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'Arquivo ou payload excede o limite';
      } else if (e.type === 'entity.parse.failed') {
        status = 400;
        code = 'INVALID_JSON';
        message = 'JSON inválido';
      } else if (e.code?.startsWith('LIMIT_')) {
        status = 400;
        code = 'INVALID_UPLOAD';
        message = 'Upload inválido';
      }
    }
    if (status >= 500) logger.error({ err: error, code }, 'Request failed');
    res.status(status).json({ error: { code, message } });
  };
