import { z } from 'zod';
import { AppError } from '../../shared/errors/index.js';
const remoteId = z.union([z.string(), z.number()]).transform(String);
const preapproval = z.object({
  id: remoteId,
  external_reference: z.string(),
  status: z.string(),
  init_point: z.string().url().optional(),
  last_modified: z.string().optional(),
  auto_recurring: z.object({ transaction_amount: z.number(), currency_id: z.string() }),
});
const invoice = z.object({
  id: remoteId,
  preapproval_id: z.string(),
  debit_date: z.string(),
  payment: z.object({ id: remoteId, status: z.string().optional() }).nullable().optional(),
});
const payment = z.object({
  id: remoteId,
  status: z.string(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  date_approved: z.string().nullable(),
  date_last_updated: z.string(),
  transaction_amount_refunded: z.number().optional(),
});
export type ProviderSubscription = z.infer<typeof preapproval>;
export interface ConfirmedPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  updatedAt: string;
  periodStart: string;
  subscription: ProviderSubscription;
}
export interface PaymentGateway {
  create(input: {
    id: string;
    email: string;
    amount: number;
    name: string;
    backUrl: string;
  }): Promise<ProviderSubscription>;
  cancel(id: string): Promise<void>;
  subscription(id: string): Promise<ProviderSubscription>;
  confirmedPayment(type: string, id: string): Promise<ConfirmedPayment | null>;
}
export class MercadoPagoService implements PaymentGateway {
  constructor(private token: string) {}
  private async call(path: string, method = 'GET', body?: unknown, key?: string): Promise<unknown> {
    if (!this.token)
      throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Mercado Pago não configurado');
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(key ? { 'X-Idempotency-Key': key } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        'Não foi possível consultar o Mercado Pago',
      );
    return response.json();
  }
  async create(input: {
    id: string;
    email: string;
    amount: number;
    name: string;
    backUrl: string;
  }) {
    return preapproval.parse(
      await this.call(
        '/preapproval',
        'POST',
        {
          reason: `Onde Tem — ${input.name}`,
          external_reference: input.id,
          payer_email: input.email,
          back_url: input.backUrl,
          status: 'pending',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: input.amount,
            currency_id: 'BRL',
          },
        },
        input.id,
      ),
    );
  }
  async cancel(id: string) {
    await this.call(`/preapproval/${encodeURIComponent(id)}`, 'PUT', { status: 'cancelled' });
  }
  async subscription(id: string) {
    return preapproval.parse(await this.call(`/preapproval/${encodeURIComponent(id)}`));
  }
  async confirmedPayment(type: string, id: string): Promise<ConfirmedPayment | null> {
    let bill: z.infer<typeof invoice>;
    if (type === 'subscription_authorized_payment')
      bill = invoice.parse(await this.call(`/authorized_payments/${encodeURIComponent(id)}`));
    else {
      const search = z
        .object({ results: z.array(invoice) })
        .parse(
          await this.call(
            `/authorized_payments/search?payment_id=${encodeURIComponent(id)}&limit=2`,
          ),
        );
      if (search.results.length !== 1) return null;
      bill = search.results[0]!;
    }
    if (!bill.payment?.id) return null;
    const [charge, subscription] = await Promise.all([
      this.call(`/v1/payments/${encodeURIComponent(bill.payment.id)}`).then((v) =>
        payment.parse(v),
      ),
      this.subscription(bill.preapproval_id),
    ]);
    if (type === 'payment' && charge.id !== id)
      throw new AppError(400, 'PAYMENT_MISMATCH', 'Pagamento incompatível');
    return {
      id: charge.id,
      status: (charge.transaction_amount_refunded ?? 0) > 0 ? 'refunded' : charge.status,
      amount: charge.transaction_amount,
      currency: charge.currency_id,
      paidAt: charge.date_approved,
      updatedAt: charge.date_last_updated,
      periodStart: bill.debit_date,
      subscription,
    };
  }
}
