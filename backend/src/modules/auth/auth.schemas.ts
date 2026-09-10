import { z } from 'zod';
import { text } from '../../shared/utils/validation.js';
export const credentials = z
  .object({ email: z.string().email().max(254), password: z.string().min(8).max(128) })
  .strict();
export const registerSchema = credentials.extend({ name: text(120).min(2) }).strict();
export const forgotSchema = z.object({ email: z.string().email().max(254) }).strict();
export const resetSchema = z.object({ password: z.string().min(8).max(128) }).strict();
