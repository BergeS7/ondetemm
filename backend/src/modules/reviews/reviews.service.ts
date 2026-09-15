import * as queries from './reviews.repository.js';
import type { Actor, Database, Page } from '../../shared/types/index.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/index.js';
export class ReviewService {
  constructor(private db: Database) {}
  list(companyId: string, page: Page) {
    return this.db.run(undefined, (s) => queries.listPublicReviews(s, [companyId], page));
  }
  submit(actor: Actor, companyId: string, input: { rating: number; comment?: string | null }) {
    return this.db.run(actor, (s) =>
      queries.upsertReview(s, [companyId, actor.id, input.rating, input.comment ?? null]),
    );
  }
  async remove(actor: Actor, id: string) {
    return this.db.run(actor, async (s) => {
      const review = await queries.findReview(s, [id]);
      if (review.user_id !== actor.id && actor.role !== 'ADMIN') throw new ForbiddenError();
      await queries.deleteReview(s, [id]);
      return { success: true };
    });
  }
  async mine(actor: Actor, companyId: string) {
    const rows = await this.db.run(actor, (s) => queries.findOwnReview(s, [companyId, actor.id]));
    if (!rows.rows.length) throw new NotFoundError('Você ainda não avaliou esta empresa');
    return rows.rows[0];
  }
  reply(actor: Actor, id: string, reply: string | null) {
    return this.db.run(actor, (s) => queries.replyToReview(s, [id, reply]));
  }
}
