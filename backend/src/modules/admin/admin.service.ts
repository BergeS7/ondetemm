import * as queries from './admin-actions.repository.js';
import type { Actor, Database, Page } from '../../shared/types/index.js';
import { adminRepository as repo } from './admin.repository.js';
import { ForbiddenError } from '../../shared/errors/index.js';
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
