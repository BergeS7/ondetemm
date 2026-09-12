import type { Sql, Page } from '../../shared/types/index.js';
import { one, paged } from '../../shared/utils/repository.js';
export function findPublicCompany(sql: Sql, values: unknown[] = []) {
  return one(
    sql,
    `select id,name,slug,short_description,description,phone,whatsapp,website,instagram,state_code,city_name,city_slug,neighborhood,street,number,complement,zipcode,latitude,longitude,logo_url,cover_url,verified,average_rating,reviews_count,is_open,plan_code,is_sponsored,is_claimed from public.public_companies where lower(state_code)=lower($1) and city_slug=$2 and slug=$3`,
    values,
  );
}
export function listCategories(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select cat.id,cat.name,cat.slug,cat.icon from public.company_categories cc join public.categories cat on cat.id=cc.category_id where cc.company_id=$1 and cat.is_active order by cat.name,cat.id',
    values,
    page,
  );
}
export function listServices(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select id,name,description,price,price_type,image_url from public.company_services where company_id=$1 and is_active order by name,id',
    values,
    page,
  );
}
export function listHours(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select day_of_week,opens_at,closes_at,is_closed from public.company_hours where company_id=$1 order by day_of_week,opens_at,id',
    values,
    page,
  );
}
export function listGallery(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    "select id,url,type,sort_order from public.company_images where company_id=$1 and type='GALLERY' order by sort_order,id",
    values,
    page,
  );
}
export function listPromotions(sql: Sql, values: unknown[] = [], page: Page) {
  return paged(
    sql,
    'select id,title,description,original_price,promotional_price,image_url,starts_at,ends_at from public.promotions where company_id=$1 and is_active and starts_at<=now() and ends_at>now() order by ends_at,id',
    values,
    page,
  );
}
