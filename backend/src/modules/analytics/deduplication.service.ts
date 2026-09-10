import * as queries from './deduplication.repository.js';
import { createHmac } from 'node:crypto';
import type { Sql } from '../../shared/types/index.js';
import type { EventInput } from './analytics.schemas.js';
export class DeduplicationService {
  constructor(private secret: string) {}
  hash(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }
  async duplicate(sql: Sql, event: EventInput, ipHash: string, uaHash: string) {
    // Company lock serializes check+insert: sliding window remains correct across processes.
    await queries.lockCompany(sql, [event.company_id]);
    const seconds = event.event_type === 'PROFILE_VIEW' ? 1800 : 60;
    const { rows } = await queries.findDuplicate(sql, [
      event.company_id,
      event.event_type,
      seconds,
      event.session_id ?? null,
      ipHash,
      uaHash,
    ]);
    return rows.length > 0;
  }
}
