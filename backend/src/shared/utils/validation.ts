import { z } from 'zod';
export const id = z.string().uuid();
export const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^<>]*$/, 'Use texto simples, sem HTML');
export const url = z
  .string()
  .url()
  .max(2048)
  .refine((v) => {
    try { return ['https:', 'http:'].includes(new URL(v).protocol); }
    catch { return false; }
  }, 'URL inválida');
export const imageUrl = z.union([
  url,
  z.string().regex(/^\/api\/images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Imagem inválida'),
]);
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const queryBool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();
export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 150)
    .replace(/-$/, '');
}
