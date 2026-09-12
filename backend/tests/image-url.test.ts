import { expect, it } from 'vitest';
import { imageUrl, url } from '../src/shared/utils/validation.js';
import { serviceSchema } from '../src/modules/services/services.schemas.js';
import { promotionSchema } from '../src/modules/promotions/promotions.schemas.js';
const image = '/api/images/6c9d7df0-0718-4843-984e-44b5f5cb47aa';
it('accepts uploaded images in services and promotions', () => {
  expect(serviceSchema.safeParse({name:'Serviço',price_type:'STARTING_AT',price:29.9,image_url:image}).success).toBe(true);
  expect(promotionSchema.safeParse({title:'Oferta',image_url:image,starts_at:'2026-09-11T00:00:00Z',ends_at:'2026-09-12T00:00:00Z'}).success).toBe(true);
});
it('rejects malformed and unsafe URLs as validation errors without throwing', () => {
  for (const value of ['/api/images/invalid', '/private/file', 'javascript:alert(1)', 'not a url']) {
    expect(imageUrl.safeParse(value).success).toBe(false);
    expect(url.safeParse(value).success).toBe(false);
  }
  expect(imageUrl.safeParse('https://example.com/photo.jpg').success).toBe(true);
});
