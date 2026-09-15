import { Router } from 'express';
import type { SitemapService } from './sitemap.service.js';
export function sitemapRoutes(s: SitemapService) {
  const r = Router();
  r.get('/sitemap.xml', async (_req, res, next) => {
    try {
      res.set('Content-Type', 'application/xml; charset=utf-8').send(await s.xml());
    } catch (error) {
      next(error);
    }
  });
  return r;
}
