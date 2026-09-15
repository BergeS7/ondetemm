import * as queries from './plan-lookup.repository.js';
import type { Sql } from '../../shared/types/index.js';
import { ForbiddenError } from '../../shared/errors/index.js';
export interface PlanLimits {
  categories: number;
  photos: number;
  services: number;
  promotions: number;
  analytics_days: number;
  home_featured: boolean;
}
export class PlanService {
  async get(sql: Sql, companyId: string) {
    return queries.findEffectivePlan(sql, [companyId]);
  }
  async require(sql: Sql, companyId: string, feature: keyof PlanLimits, amount = 1, floor = 0) {
    const plan = await this.get(sql, companyId);
    const limits = plan.limits as unknown as PlanLimits;
    if (Math.max(Number(limits[feature]), floor) < amount)
      throw new ForbiddenError('Recurso ou período não incluído no plano');
    return plan;
  }
}
