import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError, AppError } from '../../shared/errors/index.js';
export function verifyWebhook(
  secret: string,
  signature: string | undefined,
  requestId: string | undefined,
  dataId: string,
  now = Date.now(),
) {
  if (!secret) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Webhook não configurado');
  if (!signature || !requestId) throw new UnauthorizedError('Assinatura do webhook ausente');
  const values = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
  const ts = values.ts,
    v1 = values.v1;
  if (!ts || !v1 || !/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/i.test(v1))
    throw new UnauthorizedError('Assinatura do webhook inválida');
  const timestamp = Number(ts) * (ts.length === 10 ? 1000 : 1);
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) throw new UnauthorizedError('Webhook expirado');
  const expected = createHmac('sha256', secret)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(v1, 'hex')))
    throw new UnauthorizedError('Assinatura do webhook inválida');
}
