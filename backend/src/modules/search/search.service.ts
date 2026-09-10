import type { Database } from '../../shared/types/index.js';
import type { SearchQuery } from './search.schemas.js';
import { SearchRepository } from './search.repository.js';
export class SearchService {
  constructor(
    private db: Database,
    private repo = new SearchRepository(),
  ) {}
  search(q: SearchQuery) {
    return this.db.run(undefined, async (s) => {
      const normalized = { ...q, q: q.q?.replace(/^onde\s+tem\s+/i, '').trim() };
      const match = normalized.q?.match(/^(.+?)\s+em\s+(.+)$/i);
      if (match?.[1] && match[2]) {
        const cities = await this.repo.resolveLocation(s, match[2], q.state);
        if (cities.length === 1 && (!q.city || q.city === cities[0]!.slug)) {
          normalized.q = match[1];
          normalized.city = String(cities[0]!.slug);
          normalized.state = String(cities[0]!.code);
        }
      }
      return this.repo.search(s, normalized);
    });
  }
}
