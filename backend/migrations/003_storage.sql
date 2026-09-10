insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('company-images','company-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- Upload goes through Express for binary validation and quotas. Direct authenticated writes are denied.
create policy company_image_read on storage.objects for select to anon,authenticated using (
 bucket_id='company-images' and exists(select 1 from public.company_images i where i.storage_path=name and
 (public.company_public(i.company_id) or public.owns_company(i.company_id) or public.is_admin()))
);
