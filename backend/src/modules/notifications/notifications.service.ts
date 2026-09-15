import * as queries from './notifications.repository.js';
import type { Actor, Database, Page } from '../../shared/types/index.js';
export class NotificationService {
  constructor(private db: Database) {}
  list(actor: Actor, page: Page) {
    return this.db.run(actor, (s) => queries.listNotifications(s, [actor.id], page));
  }
  async unreadCount(actor: Actor) {
    const row = await this.db.run(actor, (s) => queries.unreadCount(s, [actor.id]));
    return { count: row.count };
  }
  async markRead(actor: Actor, id: string) {
    await this.db.run(actor, (s) => queries.markRead(s, [id]));
    return { success: true };
  }
  async markAllRead(actor: Actor) {
    await this.db.run(actor, (s) => queries.markAllRead(s, [actor.id]));
    return { success: true };
  }
}
