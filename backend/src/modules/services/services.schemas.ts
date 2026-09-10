import { z } from 'zod';
import { text, url } from '../../shared/utils/validation.js';
export const serviceBase = z
  .object({
    name: text(160).min(2),
    description: text(3000).nullable().optional(),
    price: z.number().min(0).max(99999999).nullable().optional(),
    price_type: z.enum(['FIXED', 'STARTING_AT', 'CONTACT']).default('CONTACT'),
    image_url: url.nullable().optional(),
    is_active: z.boolean().default(true),
  })
  .strict();
export const serviceSchema = serviceBase.refine(
  (v) => (v.price_type === 'CONTACT' ? v.price == null : v.price != null),
  'Preço incompatível com tipo',
);
export const servicePatch = serviceBase.partial().strict();
