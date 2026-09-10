import { z } from 'zod';
import { pagination, queryBool, text } from '../../shared/utils/validation.js';
export const searchSchema = pagination.extend({
  q: text(160).optional(),
  state: text(2).optional(),
  city: text(150).optional(),
  category: text(100).optional(),
  neighborhood: text(120).optional(),
  sort: z.enum(['relevance', 'rating', 'name', 'recent']).default('relevance'),
  open_now: queryBool,
  has_promotion: queryBool,
});
export type SearchQuery = z.infer<typeof searchSchema>;
