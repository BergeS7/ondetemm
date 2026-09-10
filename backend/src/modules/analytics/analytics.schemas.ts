import { z } from 'zod';
import { id, text } from '../../shared/utils/validation.js';
export const eventTypes = [
  'PROFILE_VIEW',
  'WHATSAPP_CLICK',
  'PHONE_CLICK',
  'INSTAGRAM_CLICK',
  'WEBSITE_CLICK',
  'ROUTE_CLICK',
  'PROMOTION_CLICK',
] as const;
export const eventSchema = z
  .object({
    company_id: id,
    event_type: z.enum(eventTypes),
    session_id: id.optional(),
    metadata: z
      .object({ promotion_id: id.optional(), source: text(60).optional() })
      .strict()
      .optional(),
  })
  .strict();
export const analyticsQuery = z.object({ period: z.enum(['7d', '30d', '90d']).default('7d') });
export type EventInput = z.infer<typeof eventSchema>;
