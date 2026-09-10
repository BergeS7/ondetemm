import * as queries from './webhook.repository.js';
import type { Database } from '../../shared/types/index.js';
import type { PaymentGateway } from './mercadopago.service.js';
import { ValidationError } from '../../shared/errors/index.js';
import { subscriptionsRepository as repo } from './subscriptions.repository.js';
export interface WebhookInput {
  id: string;
  type: string;
  data: { id: string };
}
export function nextMonth(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new ValidationError('Data de cobrança inválida');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, end));
  return d.toISOString();
}
export class WebhookService {
  constructor(
    private db: Database,
    private provider: PaymentGateway,
  ) {}
  async process(input: WebhookInput) {
    const eventId = `${input.type}:${input.data.id}:${input.id}`;
    await this.db.run('system', (s) =>
      queries.recordEvent(s, ['MERCADO_PAGO', eventId, input.type, JSON.stringify(input)]),
    );
    return this.db.run('system', async (s) => {
      const event = await queries.lockEvent(s, [eventId]);
      if (event.processed_at) return { received: true, duplicate: true };
      if (input.type === 'subscription_preapproval') {
        const remote = await this.provider.subscription(input.data.id);
        const sub = await repo.lock(s, remote.external_reference);
        if (sub.provider_subscription_id && sub.provider_subscription_id !== remote.id)
          throw new ValidationError('Assinatura incompatível');
        if (
          Number(sub.amount) !== remote.auto_recurring.transaction_amount ||
          sub.currency !== remote.auto_recurring.currency_id
        )
          throw new ValidationError('Valor incompatível');
        // Also links a reservation whose creation response was lost in transit.
        await queries.linkSubscription(s, [sub.id, remote.id]);
        if (remote.status === 'cancelled') await queries.markCanceled(s, [sub.id]);
        if (remote.status === 'paused') await queries.markPastDue(s, [sub.id]);
        await queries.refreshCompanyPlan(s, [sub.company_id]);
      } else {
        const charge = await this.provider.confirmedPayment(input.type, input.data.id);
        if (charge) {
          const sub = await repo.lock(s, charge.subscription.external_reference);
          if (
            sub.provider_subscription_id &&
            sub.provider_subscription_id !== charge.subscription.id
          )
            throw new ValidationError('Assinatura incompatível');
          if (
            charge.amount !== Number(sub.amount) ||
            charge.currency !== sub.currency ||
            charge.subscription.auto_recurring.transaction_amount !== Number(sub.amount) ||
            charge.subscription.auto_recurring.currency_id !== sub.currency
          )
            throw new ValidationError('Valor ou moeda incompatível');
          await queries.linkPaymentSubscription(s, [sub.id, charge.subscription.id]);
          if (charge.subscription.status === 'cancelled')
            await queries.markPaymentSubscriptionCanceled(s, [sub.id]);
          // Same payment cannot extend a period twice; old snapshots cannot replace newer status.
          const payment = await queries.upsertPayment(s, [
            sub.company_id,
            sub.id,
            charge.id,
            charge.amount,
            charge.currency,
            charge.status,
            charge.paidAt,
            charge.periodStart,
            nextMonth(charge.periodStart),
            charge.updatedAt,
          ]);
          if (payment.rows.length) {
            await repo.refreshEntitlements(s, String(sub.id));
            await queries.auditPlanChange(s, [
              sub.company_id,
              JSON.stringify({
                source: 'MERCADO_PAGO',
                paymentId: charge.id,
                subscriptionId: sub.id,
                status: charge.status,
              }),
            ]);
          }
        }
      }
      await queries.markProcessed(s, [eventId]);
      return { received: true, duplicate: false };
    });
  }
}
