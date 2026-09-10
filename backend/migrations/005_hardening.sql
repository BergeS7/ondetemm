-- Protect identity and unpublished state even if clients call Supabase REST directly.
revoke create on schema public from public,anon,authenticated;
revoke insert on public.companies from authenticated;
grant insert(owner_id,name,slug,legal_name,cnpj,short_description,description,email,phone,whatsapp,website,instagram,state_id,city_id,neighborhood_id,neighborhood,street,number,complement,zipcode,latitude,longitude,keywords) on public.companies to authenticated;
create function public.guard_company_insert() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user='authenticated' then
  if new.owner_id is distinct from auth.uid() or new.status<>'DRAFT' or new.verified or new.plan_id is not null
   or new.average_rating<>0 or new.reviews_count<>0 or new.deleted_at is not null or new.rejection_reason is not null
   or new.logo_url is not null or new.cover_url is not null then raise exception 'Protected company fields' using errcode='42501'; end if;
 end if;return new;
end $$;
create trigger company_insert_guard before insert on public.companies for each row execute function public.guard_company_insert();

create function public.guard_hours() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and old.company_id<>new.company_id then raise exception 'Cannot move hours' using errcode='42501'; end if;
 perform 1 from public.companies where id=new.company_id and deleted_at is null and status<>'SUSPENDED' for update;
 if not found then raise exception 'Company unavailable' using errcode='23514'; end if;
 if tg_op='INSERT' and (select count(*) from public.company_hours where company_id=new.company_id)>=28 then raise exception 'Too many periods' using errcode='23514'; end if;
 if exists(select 1 from public.company_hours h where h.company_id=new.company_id and h.day_of_week=new.day_of_week and h.id<>new.id and (h.is_closed or new.is_closed)) then raise exception 'Conflicting closed day' using errcode='23514'; end if;
 return new;
end $$;
create trigger hours_guard before insert or update on public.company_hours for each row execute function public.guard_hours();

-- Direct deletes also respect suspension, and category updates cannot bypass identity checks.
create function public.guard_resource_delete() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if current_setting('request.jwt.claims',true)::jsonb->>'role'='authenticated' and not public.is_admin() then
  if exists(select 1 from public.companies where id=old.company_id and status='SUSPENDED') then raise exception 'Company suspended' using errcode='42501'; end if;
 end if;return old;
end $$;
do $$ declare t text; begin foreach t in array array['company_categories','company_services','company_hours','promotions'] loop
 execute format('create trigger resource_delete_guard before delete on public.%I for each row execute function public.guard_resource_delete()',t);
end loop;end $$;
revoke execute on function public.guard_company_insert(),public.guard_hours(),public.guard_resource_delete() from public,anon,authenticated;
grant execute on function public.guard_company_insert(),public.guard_hours(),public.guard_resource_delete() to service_role;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke all on tables from anon,authenticated;
