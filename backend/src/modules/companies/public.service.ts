import * as queries from './public.repository.js';
import type { Database, Page } from '../../shared/types/index.js';
export class PublicCompanyService {
  constructor(
    private db: Database,
    private site: string,
  ) {}
  get(state: string, city: string, slug: string, page: Page) {
    return this.db.run(undefined, async (sql) => {
      const company = await queries.findPublicCompany(sql, [state, city, slug]);
      const id = company.id;
      // A fixed number of bulk queries, never a query per related record.
      const categories = await queries.listCategories(sql, [id], page);
      const services = await queries.listServices(sql, [id], page);
      const hours = await queries.listHours(sql, [id], page);
      const gallery = await queries.listGallery(sql, [id], page);
      const promotions = await queries.listPromotions(sql, [id], page);
      const canonical = `${this.site}/${String(company.state_code).toLowerCase()}/${company.city_slug}/${company.slug}`;
      const title = `${company.name} em ${company.city_name} - ${company.state_code} | Onde Tem`;
      const description = String(company.short_description);
      return {
        company,
        categories,
        services,
        hours,
        gallery,
        promotions,
        openStatus: company.is_open ? 'OPEN' : 'CLOSED',
        seo: {
          title,
          description,
          canonical,
          openGraph: { title, description, url: canonical, image: company.cover_url },
          schemaOrg: {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: company.name,
            description,
            url: canonical,
            telephone: company.phone,
            address: {
              '@type': 'PostalAddress',
              streetAddress: [company.street, company.number].filter(Boolean).join(', '),
              addressLocality: company.city_name,
              addressRegion: company.state_code,
              addressCountry: 'BR',
              postalCode: company.zipcode,
            },
          },
        },
      };
    });
  }
}
