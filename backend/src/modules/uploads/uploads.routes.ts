import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { actor, controller, param } from '../../shared/utils/http.js';
import { MAX_UPLOAD_BYTES, type UploadService } from './uploads.service.js';
export function uploadRoutes(s: UploadService, guard: RequestHandler) {
  const r = Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2, parts: 3 },
    });
  r.get('/me/companies/:id/images', guard,
    controller((req) => s.list(actor(req), param(req))));
  r.post(
    '/companies/:id/images',
    guard,
    upload.single('file'),
    controller((req) => {
      const p = z
        .object({
          type: z.enum(['LOGO', 'COVER', 'GALLERY', 'SERVICE', 'PROMOTION']),
          sort_order: z.coerce.number().int().min(0).max(100).default(0),
        })
        .strict()
        .parse(req.body);
      return s.upload(actor(req), param(req), req.file, p.type, p.sort_order);
    }, 201),
  );
  r.get(
    '/images/:id',
    controller(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.redirect(await s.signed(param(req)));
    }),
  );
  r.get(
    '/me/images/:id',
    guard,
    controller(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.redirect(await s.signed(param(req), actor(req)));
    }),
  );
  r.delete(
    '/images/:id',
    guard,
    controller((req) => s.remove(actor(req), param(req))),
  );
  return r;
}
