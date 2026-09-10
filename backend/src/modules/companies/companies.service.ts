import * as queries from './company-actions.repository.js';
import { randomUUID } from 'node:crypto';
import type { Actor, Database, Page, Sql } from '../../shared/types/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { companiesRepository as repo } from './companies.repository.js';
import { slugify } from '../../shared/utils/validation.js';
export class CompanyService {
  constructor(private db: Database) {}
  async access(actor: Actor, id: string) {
    // System lookup distinguishes missing (404) from another owner's company (403).
    const c = await this.db.run('system', (sql) => repo.get(sql, id));
    if (actor.role !== 'ADMIN' && c.owner_id !== actor.id)
      throw new ForbiddenError('Você não é proprietário desta empresa');
    return c;
  }
  async owned<T>(actor: Actor, id: string, work: (sql: Sql) => Promise<T>) {
    await this.access(actor, id);
    return this.db.run(actor, work);
  }
  create(actor: Actor, input: Record<string, unknown>) {
    return this.db.run(actor, async (sql) => {
      const { category_ids, ...fields } = input;
      let slug = slugify(String(fields.name));
      if (!slug) throw new ValidationError('Nome não gera um slug válido');
      // Random suffix keeps concurrently-created names valid without discovering private companies.
      slug = `${slug}-${randomUUID().slice(0, 8)}`;
      const company = await repo.create(sql, { ...fields, owner_id: actor.id, slug });
      if (category_ids) await repo.categories(sql, String(company.id), category_ids as string[]);
      return company;
    });
  }
  get(actor: Actor, id: string) {
    return this.owned(actor, id, (sql) => repo.get(sql, id));
  }
  patch(actor: Actor, id: string, input: Record<string, unknown>) {
    return this.owned(actor, id, async (sql) => {
      const current = await repo.lock(sql, id);
      if (current.status === 'SUSPENDED') throw new ForbiddenError('Empresa suspensa');
      const { category_ids, ...fields } = input;
      const c = await repo.update(sql, id, fields);
      if (category_ids) await repo.categories(sql, id, category_ids as string[]);
      return c;
    });
  }
  remove(actor: Actor, id: string) {
    return this.owned(actor, id, async (sql) => {
      await queries.softDeleteCompany(sql, [id]);
      return { success: true };
    });
  }
  submit(actor: Actor, id: string) {
    return this.owned(actor, id, async (sql) => {
      await queries.submitCompany(sql, [id]);
      return repo.get(sql, id);
    });
  }
  mine(actor: Actor, page: Page) {
    return this.db.run(actor, (sql) => repo.mine(sql, actor.id, page));
  }
  async publicExists(id: string) {
    return this.db.run(undefined, async (sql) => {
      const r = await queries.findPublishedCompany(sql, [id]);
      if (!r.rows.length) throw new NotFoundError();
    });
  }
}
