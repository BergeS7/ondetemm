import type { Request, Response } from 'express';
import { UnauthorizedError } from '../errors/index.js';
import { id } from './validation.js';
export function actor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}
export function param(req: Request, key = 'id') {
  return id.parse(req.params[key]);
}
export const controller =
  (fn: (req: Request, res: Response) => Promise<unknown>, status = 200) =>
  async (req: Request, res: Response) => {
    const data = await fn(req, res);
    if (!res.headersSent) res.status(status).json(data);
  };
