import { randomUUID } from 'node:crypto';
import * as queries from './admin-actions.repository.js';
import * as claimQueries from '../companies/company-claims.repository.js';
import { companiesRepository } from '../companies/companies.repository.js';
import type { Actor, Database, Page } from '../../shared/types/index.js';
import { adminRepository as repo } from './admin.repository.js';
import { ForbiddenError, ValidationError, ConflictError } from '../../shared/errors/index.js';
import { slugify } from '../../shared/utils/validation.js';
import type { Mailer } from '../email/email.service.js';
const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
export class AdminService {
  constructor(
    private db: Database,
    private mailer?: Mailer,
  ) {}
  private check(a: Actor) {
    if (a.role !== 'ADMIN') throw new ForbiddenError();
  }
  private async emailUser(userId: string, subject: string, body: string) {
    if (!this.mailer) return;
    try {
      const row = await this.db.run('system', (s) => queries.findEmail(s, [userId]));
      if (row.rows[0]?.email) await this.mailer.send(row.rows[0].email, subject, body);
    } catch {
      // Best-effort notification: never let a lookup/send failure surface to the caller.
    }
  }
  dashboard(a: Actor) {
    this.check(a);
    return this.db.run(a, repo.dashboard);
  }
  companies(a: Actor, p: Page, status?: string, search?: string) {
    this.check(a);
    return this.db.run(a, (s) => repo.companies(s, p, status, search));
  }
  users(a: Actor, p: Page, search?: string) {
    this.check(a);
    return this.db.run(a, (s) => repo.users(s, p, search));
  }
  list(a: Actor, table: 'profiles' | 'plans' | 'subscriptions' | 'admin_audit_logs', p: Page) {
    this.check(a);
    return this.db.run(a, (s) => repo.list(s, table, p));
  }
  async moderate(a: Actor, id: string, status: string, reason?: string) {
    this.check(a);
    const company = await this.db.run(a, async (s) => {
      await queries.transitionCompany(s, [id, status, reason ?? null]);
      return queries.findCompany(s, [id]);
    });
    if (company.owner_id) {
      const subject =
        status === 'ACTIVE'
          ? `${company.name} está aprovada!`
          : status === 'REJECTED'
            ? `${company.name} precisa de ajustes`
            : `${company.name} foi suspensa`;
      const body =
        status === 'ACTIVE'
          ? `Boas notícias! ${company.name} já está publicada e disponível na busca do Onde Tem.`
          : status === 'REJECTED'
            ? (reason ?? 'Confira os detalhes no painel e reenvie para aprovação.')
            : 'Entre em contato com a administração para mais detalhes.';
      void this.emailUser(String(company.owner_id), subject, body);
    }
    return company;
  }
  analytics(a: Actor, p: Page) {
    this.check(a);
    return this.db.run(a, (s) => queries.listAnalytics(s, [], p));
  }
  companyClaims(a: Actor, p: Page, status?: string) {
    this.check(a);
    return this.db.run(a, (s) => claimQueries.listClaims(s, p, status));
  }
  async approveCompanyClaim(a: Actor, id: string) {
    this.check(a);
    const company = await this.db.run(a, (s) => claimQueries.approveClaim(s, [id]));
    if (company.owner_id)
      void this.emailUser(
        String(company.owner_id),
        `Você agora é o responsável por ${company.name}`,
        `Sua reivindicação foi aprovada. Acesse o painel para gerenciar ${company.name}.`,
      );
    return company;
  }
  async rejectCompanyClaim(a: Actor, id: string, reason?: string) {
    this.check(a);
    const claim = await this.db.run(a, (s) => claimQueries.rejectClaim(s, [id, reason ?? null]));
    void this.emailUser(
      String(claim.user_id),
      'Sua reivindicação não foi aprovada',
      reason ?? 'Não foi possível confirmar sua propriedade sobre esta empresa.',
    );
    return claim;
  }
  createUnclaimedCompany(a: Actor, input: Record<string, unknown>) {
    this.check(a);
    return this.db.run('system', async (s) => {
      const { category_ids, source, ...fields } = input;
      const name = String(fields.name);
      const cityId = String(fields.city_id);
      // Serialize concurrent submissions for the same (city, name) so two simultaneous
      // requests can never both pass the duplicate check and create the same company twice.
      await s.query('select pg_advisory_xact_lock(hashtext($1))', [
        `unclaimed-company:${cityId}:${normalizeName(name)}`,
      ]);
      const candidates = await s.query<{ id: string; name: string }>(
        'select id,name from public.companies where city_id=$1 and deleted_at is null',
        [cityId],
      );
      const duplicate = candidates.rows.find((r) => normalizeName(r.name) === normalizeName(name));
      if (duplicate)
        throw new ConflictError(
          `Já existe uma empresa cadastrada com este nome nesta cidade (id: ${duplicate.id})`,
        );
      let slug = slugify(name);
      if (!slug) throw new ValidationError('Nome não gera um slug válido');
      slug = `${slug}-${randomUUID().slice(0, 8)}`;
      // Published without an owner, but held for review like any other submission —
      // an admin must approve it before it is publicly searchable.
      const company = await companiesRepository.create(s, {
        ...fields,
        owner_id: null,
        status: 'PENDING_APPROVAL',
        slug,
      });
      if (category_ids)
        await companiesRepository.categories(s, String(company.id), category_ids as string[]);
      await queries.auditLog(s, [
        a.id,
        'COMPANY_CREATED_UNCLAIMED',
        'company',
        String(company.id),
        JSON.stringify({ name, source: typeof source === 'string' ? source.slice(0, 80) : 'manual' }),
      ]);
      return company;
    });
  }
  trials(a: Actor, p: Page) {
    this.check(a);
    return this.db.run(a, (s) => repo.trials(s, p));
  }
  grantTrial(a: Actor, companyId: string, planCode: string, days: number) {
    this.check(a);
    return this.db.run('system', async (s) => {
      await queries.lockCompanyForTrial(s, [companyId]);
      const live = await queries.findLiveSubscription(s, [companyId]);
      if (live.rows.length)
        throw new ConflictError(
          'Esta empresa já tem uma assinatura ativa ou pendente. Cancele-a antes de conceder um teste grátis.',
        );
      const plan = await queries.findPaidPlan(s, [planCode]);
      const subscription = await queries.grantTrialSubscription(s, [
        randomUUID(),
        companyId,
        plan.id,
        days,
      ]);
      await queries.refreshCompanyPlan(s, [companyId]);
      await queries.auditLog(s, [
        a.id,
        'TRIAL_GRANTED',
        'subscription',
        String(subscription.id),
        JSON.stringify({ company_id: companyId, plan_code: planCode, days }),
      ]);
      const company = await queries.findCompany(s, [companyId]);
      if (company.owner_id) {
        const title = `Você ganhou ${days} ${days === 1 ? 'dia' : 'dias'} do plano ${plan.name}`;
        const body = `${company.name} tem acesso completo ao plano ${plan.name} por tempo limitado, sem custo.`;
        await queries.notifyUser(s, [
          company.owner_id,
          'TRIAL_GRANTED',
          title,
          body,
          'company',
          companyId,
        ]);
        void this.emailUser(String(company.owner_id), title, body);
      }
      return subscription;
    });
  }
  cancelTrial(a: Actor, subscriptionId: string) {
    this.check(a);
    return this.db.run('system', async (s) => {
      const trial = await queries.findTrialSubscription(s, [subscriptionId]);
      if (trial.status === 'CANCELED') return { success: true };
      await queries.cancelTrialSubscription(s, [subscriptionId]);
      await queries.refreshCompanyPlan(s, [trial.company_id]);
      await queries.auditLog(s, [
        a.id,
        'TRIAL_CANCELED',
        'subscription',
        subscriptionId,
        JSON.stringify({ company_id: trial.company_id }),
      ]);
      const company = await queries.findCompany(s, [trial.company_id]);
      if (company.owner_id) {
        const title = `O teste grátis de ${company.name} foi encerrado`;
        const body = 'O acesso ao plano concedido temporariamente foi encerrado pela administração.';
        await queries.notifyUser(s, [
          company.owner_id,
          'TRIAL_CANCELED',
          title,
          body,
          'company',
          trial.company_id,
        ]);
        void this.emailUser(String(company.owner_id), title, body);
      }
      return { success: true };
    });
  }
  suspendUser(a: Actor, id: string, reason: string) {
    this.check(a);
    if (a.id === id) throw new ForbiddenError('Não suspenda sua própria conta');
    return this.db.run('system', async (s) => {
      await queries.suspendProfile(s, [id]);
      await queries.auditSuspension(s, [a.id, id, JSON.stringify({ reason })]);
      return { success: true };
    });
  }
  reactivateUser(a: Actor, id: string) {
    this.check(a);
    return this.db.run(a, async (s) => {
      await queries.reactivateProfile(s, [id]);
      return { success: true };
    });
  }
}
