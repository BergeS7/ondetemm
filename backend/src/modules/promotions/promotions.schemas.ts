import { z } from 'zod';
import { text, imageUrl } from '../../shared/utils/validation.js';
export const promotionBase = z
  .object({
    title: text(160).min(2),
    description: text(3000).nullable().optional(),
    original_price: z.number().min(0).max(99999999).nullable().optional(),
    promotional_price: z.number().min(0).max(99999999).nullable().optional(),
    image_url: imageUrl.nullable().optional(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    is_active: z.boolean().default(true),
  })
  .strict();
export const promotionSchema = promotionBase
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), 'Fim deve ser posterior ao início')
  .refine(
    (v) =>
      v.original_price == null ||
      v.promotional_price == null ||
      v.promotional_price <= v.original_price,
    'Preço promocional maior que original',
  );
export const promotionPatch = promotionBase.partial().strict();
