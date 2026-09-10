import { z } from 'zod';
import type { Actor, Page } from '../../shared/types/index.js';
import type { CompanyService } from '../companies/companies.service.js';
import { HoursRepository } from './hours.repository.js';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const hoursSchema = z
  .object({
    hours: z
      .array(
        z
          .object({
            day_of_week: z.number().int().min(0).max(6),
            opens_at: time.nullable(),
            closes_at: time.nullable(),
            is_closed: z.boolean(),
          })
          .strict()
          .refine(
            (v) =>
              v.is_closed
                ? v.opens_at === null && v.closes_at === null
                : !!v.opens_at && !!v.closes_at && v.opens_at !== v.closes_at,
            'Horários inválidos',
          ),
      )
      .max(28),
  })
  .strict();
export class HoursService {
  constructor(
    private companies: CompanyService,
    private repo = new HoursRepository(),
  ) {}
  replace(actor: Actor, id: string, input: z.infer<typeof hoursSchema>) {
    return this.companies.owned(actor, id, (s) => this.repo.replace(s, id, input.hours));
  }
  list(actor: Actor, id: string, p: Page) {
    return this.companies.owned(actor, id, (s) => this.repo.list(s, id, p));
  }
}
