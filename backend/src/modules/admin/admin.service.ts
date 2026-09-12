import { randomUUID } from 'node:crypto';
import * as queries from './admin-actions.repository.js';
import * as claimQueries from '../companies/company-claims.repository.js';
import { companiesRepository } from '../companies/companies.repository.js';
import type { Actor, Database, Page } from '../../shared/types/index.js';
import { adminRepository as repo } from './admin.repository.js';
import { ForbiddenError, ValidationError } from '../../shared/errors/index.js';
import { slugify } from '../../shared/utils/validation.js';
export class AdminService {
  constructor(private db: Database) {}
  private check(a: Actor) {
    if (a.role !== 'ADMIN') throw new ForbiddenError();
  }
  dashboard(a: Actor) {
    this.check(a);
    return this.db.run(a, repo.dashboard);
  }
  companies(a: Actor, p: Page, status?: string) {
    this.check(a);
    return this.db.run(a, (s) => repo.companies(s, p, status));
  }
  list(a: Actor, table: 'profiles' | 'plans' | 'subscriptions' | 'admin_audit_logs', p: Page) {
    this.check(a);
    return this.db.run(a, (s) => repo.list(s, table, p));
  }
  moderate(a: Actor, id: string, status: string, reason?: string) {
    this.check(a);
    return this.db.run(a, async (s) => {
      await queries.transitionCompany(s, [id, status, reason ?? null]);
      return queries.findCompany(s, [id]);
    });
  }
  analytics(a: Actor, p: Page) {
    this.check(a);
    return this.db.run(a, (s) => queries.listAnalytics(s, [], p));
  }
  companyClaims(a: Actor, p: Page, status?: string) {
    this.check(a);
    return this.db.run(a, (s) => claimQueries.listClaims(s, p, status));
  }
  approveCompanyClaim(a: Actor, id: string) {
    this.check(a);
    return this.db.run(a, (s) => claimQueries.approveClaim(s, [id]));
  }
  rejectCompanyClaim(a: Actor, id: string, reason?: string) {
    this.check(a);
    return this.db.run(a, (s) => claimQueries.rejectClaim(s, [id, reason ?? null]));
  }
  createUnclaimedCompany(a: Actor, input: Record<string, unknown>) {
    this.check(a);
    return this.db.run('system', async (s) => {
      const { category_ids, ...fields } = input;
      let slug = slugify(String(fields.name));
      if (!slug) throw new ValidationError('Nome não gera um slug válido');
      slug = `${slug}-${randomUUID().slice(0, 8)}`;
      const company = await companiesRepository.create(s, {
        ...fields,
        owner_id: null,
        status: 'ACTIVE',
        slug,
      });
      if (category_ids) await companiesRepository.categories(s, String(company.id), category_ids as string[]);
      await queries.auditLog(s, [
        a.id,
        'COMPANY_CREATED_UNCLAIMED',
        'company',
        String(company.id),
        JSON.stringify({ name: fields.name }),
      ]);
      return company;
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
}
