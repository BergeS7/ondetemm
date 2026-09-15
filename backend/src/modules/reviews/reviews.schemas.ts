import { z } from 'zod';
import { text } from '../../shared/utils/validation.js';
export const reviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: text(2000).nullable().optional(),
  })
  .strict();
