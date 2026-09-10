import type { z } from 'zod';
import type { Actor, Database, Page, Row } from './types/index.js';
import { ResourceRepository } from './resource.repository.js';
import type { CompanyService } from '../modules/companies/companies.service.js';
export class ResourceService {
  private repo: ResourceRepository;
  constructor(
    private db: Database,
    private companies: CompanyService,
    table: 'company_services' | 'promotions',
    private schema: z.ZodType,
  ) {
    this.repo = new ResourceRepository(table);
  }
  create(actor: Actor, companyId: string, input: unknown) {
    const data = this.schema.parse(input) as Row;
    return this.companies.owned(actor, companyId, (s) =>
      this.repo.create(s, { ...data, company_id: companyId }),
    );
  }
  async patch(actor: Actor, id: string, input: Row) {
    const old = await this.db.run('system', (s) => this.repo.get(s, id));
    const {
      id: _id,
      company_id: _company,
      created_at: _created,
      updated_at: _updated,
      ...fields
    } = old;
    void _id;
    void _company;
    void _created;
    void _updated;
    // pg numeric/timestamp representations are normalized before validating the merged record.
    for (const key of ['price', 'original_price', 'promotional_price'])
      if (fields[key] != null) fields[key] = Number(fields[key]);
    for (const key of ['starts_at', 'ends_at'])
      if (fields[key] instanceof Date) fields[key] = (fields[key] as Date).toISOString();
    this.schema.parse({ ...fields, ...input });
    return this.companies.owned(actor, String(old.company_id), (s) =>
      this.repo.update(s, id, input),
    );
  }
  async remove(actor: Actor, id: string) {
    const old = await this.db.run('system', (s) => this.repo.get(s, id));
    return this.companies.owned(actor, String(old.company_id), (s) => this.repo.remove(s, id));
  }
  async list(actor: Actor | undefined, company: string, page: Page) {
    if (actor) await this.companies.access(actor, company);
    else await this.companies.publicExists(company);
    return this.db.run(actor, (s) => this.repo.list(s, company, page));
  }
}
