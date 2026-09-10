import { afterEach, it, expect, vi } from 'vitest';
import { SupabaseAuthService } from '../src/modules/auth/auth.service.js';
import { MercadoPagoService } from '../src/modules/subscriptions/mercadopago.service.js';
import { verifyWebhook } from '../src/modules/subscriptions/webhook-signature.js';
import { nextMonth } from '../src/modules/subscriptions/webhook.service.js';
import { config } from './helpers.js';
import { createHmac } from 'node:crypto';
afterEach(() => vi.unstubAllGlobals());
it('real Supabase Auth adapter verifies bearer through getUser, not local decoding', async () => {
  const user = {
    id: 'a00f2299-cc6f-4bce-8a3c-47c7f13ef981',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const fetcher = vi.fn(
    async (_input: RequestInfo | URL) =>
      new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  const auth = new SupabaseAuthService(config);
  expect(await auth.verify('test-bearer')).toEqual({ id: user.id });
  expect(String(fetcher.mock.calls[0]?.[0])).toContain('/auth/v1/user');
});
it('Mercado Pago adapter follows invoice to payment and verifies subscription', async () => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const payload = url.includes('/authorized_payments/')
      ? {
          id: 10,
          preapproval_id: 'sub-123',
          debit_date: '2026-09-10T00:00:00Z',
          payment: { id: 20 },
        }
      : url.includes('/v1/payments/')
        ? {
            id: 20,
            status: 'approved',
            transaction_amount: 29.9,
            currency_id: 'BRL',
            date_approved: '2026-09-10T00:00:00Z',
            date_last_updated: '2026-09-10T00:00:00Z',
          }
        : {
            id: 'sub-123',
            external_reference: 'local-id',
            status: 'authorized',
            auto_recurring: { transaction_amount: 29.9, currency_id: 'BRL' },
          };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const result = await new MercadoPagoService('test').confirmedPayment(
    'subscription_authorized_payment',
    '10',
  );
  expect(result?.status).toBe('approved');
  expect(result?.subscription.external_reference).toBe('local-id');
  expect(calls).toHaveLength(3);
});
it('webhook rejects expired and tampered signatures and supports seconds timestamps', () => {
  const ts = String(Math.floor(Date.now() / 1000)),
    secret = 'secret',
    requestId = 'request';
  const hash = createHmac('sha256', secret)
    .update(`id:resource;request-id:${requestId};ts:${ts};`)
    .digest('hex');
  expect(() => verifyWebhook(secret, `ts=${ts},v1=${hash}`, requestId, 'resource')).not.toThrow();
  expect(() => verifyWebhook(secret, `ts=${ts},v1=${hash}`, requestId, 'changed')).toThrow();
  expect(() =>
    verifyWebhook(secret, `ts=${ts},v1=${hash}`, requestId, 'resource', Date.now() + 600000),
  ).toThrow();
});
it('monthly periods clamp month ends without accidentally extending to March', () => {
  expect(nextMonth('2026-01-31T12:00:00Z')).toBe('2026-02-28T12:00:00.000Z');
  expect(nextMonth('2028-01-31T12:00:00Z')).toBe('2028-02-29T12:00:00.000Z');
});
