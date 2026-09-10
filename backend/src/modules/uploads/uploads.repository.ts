import type { Sql } from '../../shared/types/index.js';
import { one } from '../../shared/utils/repository.js';
export class UploadRepository {
  company(s: Sql, id: string) {
    return one(
      s,
      'select owner_id from public.companies where id=$1 and deleted_at is null for update',
      [id],
    );
  }
  get(s: Sql, id: string) {
    return one(s, 'select * from public.company_images where id=$1', [id]);
  }
  async create(s: Sql, id: string, company: string, path: string, type: string, sort: number) {
    const image = await one(
      s,
      'insert into public.company_images(id,company_id,url,storage_path,type,sort_order) values($1,$2,$3,$4,$5,$6) returning id,url,type,sort_order',
      [id, company, `/api/images/${id}`, path, type, sort],
    );
    if (type === 'LOGO' || type === 'COVER')
      await s.query(
        `update public.companies set ${type === 'LOGO' ? 'logo_url' : 'cover_url'}=$2 where id=$1`,
        [company, image.url],
      );
    return image;
  }
  async remove(s: Sql, id: string, company: unknown, url: unknown) {
    await s.query('delete from public.company_images where id=$1', [id]);
    await s.query(
      'update public.companies set logo_url=case when logo_url=$2 then null else logo_url end,cover_url=case when cover_url=$2 then null else cover_url end where id=$1',
      [company, url],
    );
  }
}
