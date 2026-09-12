import * as queries from './sitemap.repository.js';
import type { Database } from '../../shared/types/index.js';
function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}
export class SitemapService {
  constructor(
    private db: Database,
    private site: string,
  ) {}
  async xml() {
    const rows = await this.db.run(undefined, (s) => queries.listPublishedCompanies(s));
    const staticUrls = [this.site, `${this.site}/entrar`, `${this.site}/cadastrar`];
    const urls = [
      ...staticUrls.map((loc) => `<url><loc>${escapeXml(loc)}</loc></url>`),
      ...rows.rows.map((r) => {
        const loc = `${this.site}/${String(r.state_code).toLowerCase()}/${r.city_slug}/${r.slug}`;
        const lastmod = new Date(String(r.updated_at)).toISOString();
        return `<url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`;
      }),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  }
}
