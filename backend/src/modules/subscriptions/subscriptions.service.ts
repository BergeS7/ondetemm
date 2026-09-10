import * as queries from './billing.repository.js';
import { randomUUID } from 'node:crypto';
import type { Actor, Database, Page, Row } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import type { PaymentGateway } from './mercadopago.service.js';
import { ConflictError, ValidationError } from '../../shared/errors/index.js';
export class SubscriptionService {
  constructor(
    private db: Database,
    private companies: CompanyService,
    private provider: PaymentGateway,
    private frontend: string,
  ) {}
  async create(a: Actor, company: string, code: string) {
    await this.companies.access(a, company);
    const pending = await this.db.run<Row>('system', async (s) => {
      await queries.lockActiveCompany(s, [company]);
      const live = (await queries.findLiveSubscription(s, [company])).rows[0];
      if (live) {
        if (live.checkout_url && live.status === 'PENDING') return { ...live, reuse: true };
        throw new ConflictError(
          'Existe uma assinatura ativa ou contratação em processamento. Consulte ou cancele antes de contratar novamente.',
        );
      }
      const plan = await queries.findPaidPlan(s, [code]);
      return {
        ...(await queries.reserveSubscription(s, [
          randomUUID(),
          company,
          plan.id,
          plan.price_monthly,
        ])),
        name: plan.name,
        reuse: false,
      };
    });
    if (pending.reuse) return pending;
    // Reservation remains PENDING after a timeout: never automatically issue another charge.
    const remote = await this.provider.create({
      id: String(pending.id),
      email: a.email,
      amount: Number(pending.amount),
      name: String(pending.name),
      backUrl: `${this.frontend}/assinatura/retorno`,
    });
    if (remote.external_reference !== pending.id || !remote.init_point)
      throw new ValidationError('Resposta de assinatura incompatível');
    const checkout = new URL(remote.init_point);
    if (
      checkout.protocol !== 'https:' ||
      !(
        checkout.hostname === 'mercadopago.com.br' ||
        checkout.hostname.endsWith('.mercadopago.com.br')
      )
    )
      throw new ValidationError('Checkout inválido');
    return this.db.run('system', (s) =>
      queries.saveCheckout(s, [pending.id, remote.id, remote.init_point]),
    );
  }
  async list(a: Actor, company: string, p: Page) {
    await this.companies.access(a, company);
    return this.db.run(a, (s) => queries.listSubscriptions(s, [company], p));
  }
  async cancel(a: Actor, id: string) {
    const sub = await this.db.run('system', (s) => queries.findSubscription(s, [id]));
    await this.companies.access(a, String(sub.company_id));
    if (sub.status === 'CANCELED') return { success: true };
    if (!sub.provider_subscription_id)
      throw new ConflictError('Contratação pendente de reconciliação com o provedor');
    await this.provider.cancel(String(sub.provider_subscription_id));
    return this.db.run('system', async (s) => {
      await queries.cancelSubscription(s, [id]);
      await queries.refreshCompanyPlan(s, [sub.company_id]);
      return { success: true };
    });
  }
}
