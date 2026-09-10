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
  .refine((v) => ['https:', 'http:'].includes(new URL(v).protocol), 'URL inválida');
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
