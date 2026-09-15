import { z } from 'zod';
import { id, text, url } from '../../shared/utils/validation.js';
const phone = z.string().regex(/^\+?[0-9]{10,15}$/);
export const companySchema = z
  .object({
    name: text(160).min(2),
    short_description: text(280).min(5),
    description: text(10000).min(5),
    legal_name: text(180).nullable().optional(),
    cnpj: z
      .string()
      .regex(/^\d{14}$/)
      .nullable()
      .optional(),
    email: z.string().email().nullable().optional(),
    phone: phone.nullable().optional(),
    whatsapp: phone.nullable().optional(),
    website: url.nullable().optional(),
    instagram: url.nullable().optional(),
    state_id: id,
    city_id: id,
    neighborhood_id: id.nullable().optional(),
    neighborhood: text(120).nullable().optional(),
    street: text(200).nullable().optional(),
    number: text(20).nullable().optional(),
    complement: text(120).nullable().optional(),
    zipcode: z
      .string()
      .regex(/^\d{8}$/)
      .nullable()
      .optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    keywords: z.array(text(60).min(2)).max(20).optional(),
    category_ids: z
      .array(id)
      .min(1)
      .max(8)
      .refine((a) => new Set(a).size === a.length)
      .optional(),
  })
  .strict();
export const adminCompanySchema = companySchema.extend({
  // Free-text provenance note for admin-created unclaimed listings (e.g. "manual",
  // "diretorio-comercial-2026"). Recorded in the audit log, never trusted as an identifier.
  source: text(80).nullable().optional(),
});
export const companyPatch = companySchema
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Informe campos para atualizar');
export const claimSchema = z
  .object({
    message: text(1000).optional(),
  })
  .strict();
