create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='ADMIN' and status='ACTIVE')
$$;
create function public.is_member() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='ACTIVE')
$$;
create function public.owns_company(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_member() and exists(select 1 from public.companies where id=cid and owner_id=auth.uid() and deleted_at is null)
$$;
create function public.company_public(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.companies where id=cid and status='ACTIVE' and deleted_at is null)
$$;
create function public.effective_plan(cid uuid) returns uuid language sql stable security definer set search_path=public as $$
 select coalesce((select s.plan_id from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.company_id=cid and s.status in ('ACTIVE','CANCELED') and s.current_period_end>now() and p.is_active
 order by s.current_period_end desc limit 1),(select id from public.plans where code='FREE'))
$$;
create function public.company_open(cid uuid, at_time timestamptz default now()) returns boolean language sql stable security definer set search_path=public as $$
 with local_time as (select at_time at time zone ci.timezone t from public.companies c join public.cities ci on ci.id=c.city_id where c.id=cid)
 select exists(select 1 from public.company_hours h cross join local_time l where h.company_id=cid and not h.is_closed and (
 (h.day_of_week=extract(dow from l.t)::int and ((h.opens_at<h.closes_at and l.t::time>=h.opens_at and l.t::time<h.closes_at) or (h.opens_at>h.closes_at and l.t::time>=h.opens_at)))
 or (h.day_of_week=(extract(dow from l.t)::int+6)%7 and h.opens_at>h.closes_at and l.t::time<h.closes_at)))
$$;

-- All public reads of companies use this explicit projection. No owner, CNPJ, moderation or payment fields.
create view public.public_companies with (security_barrier=true) as
 select c.id,c.name,c.slug,c.short_description,c.description,c.phone,c.whatsapp,c.website,c.instagram,
 c.state_id,c.city_id,c.neighborhood,c.street,c.number,c.complement,c.zipcode,c.latitude,c.longitude,
 c.logo_url,c.cover_url,c.keywords,c.verified,c.average_rating,c.reviews_count,c.created_at,c.updated_at,
 s.code as state_code,ci.name as city_name,ci.slug as city_slug,ci.timezone,
 p.code as plan_code,p.ranking_weight,(p.code<>'FREE') as is_sponsored,
 public.company_open(c.id) as is_open,
 least(1.0,(case when c.description<>'' then 1 else 0 end + case when c.whatsapp is not null then 1 else 0 end + case when c.street is not null then 1 else 0 end + case when c.logo_url is not null then 1 else 0 end)/4.0) as completeness,
 (select count(*) from public.interaction_events e where e.company_id=c.id and e.created_at>now()-interval '30 days') as popularity
 from public.companies c join public.states s on s.id=c.state_id join public.cities ci on ci.id=c.city_id
 join public.plans p on p.id=public.effective_plan(c.id)
 where c.status='ACTIVE' and c.deleted_at is null and ci.is_active;

do $$ declare t text; begin
 foreach t in array array['profiles','countries','states','cities','neighborhoods','categories','plans','companies','company_categories','company_services','company_hours','company_images','promotions','subscriptions','payments','payment_events','interaction_events','admin_audit_logs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy admin_all on public.%I to authenticated using (public.is_admin()) with check (public.is_admin())',t);
 end loop;
end $$;
grant usage on schema public to anon,authenticated,service_role;
grant select on public.public_companies to anon,authenticated,service_role;
grant select on public.profiles to authenticated;
grant update(name,phone,avatar_url) on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy edit_profile on public.profiles for update to authenticated using(id=auth.uid() and public.is_member()) with check(id=auth.uid());
do $$ declare t text; begin
 foreach t in array array['countries','states','cities','neighborhoods','categories','plans'] loop
 execute format('grant select on public.%I to anon,authenticated',t);
 execute format('create policy public_read on public.%I for select to anon,authenticated using (true)',t);
 end loop;
end $$;
grant select,insert,delete on public.companies to authenticated;
grant update(name,slug,legal_name,cnpj,short_description,description,email,phone,whatsapp,website,instagram,state_id,city_id,neighborhood_id,neighborhood,street,number,complement,zipcode,latitude,longitude,keywords) on public.companies to authenticated;
create policy company_owner_read on public.companies for select to authenticated using(owner_id=auth.uid() and public.is_member() and deleted_at is null);
create policy company_owner_insert on public.companies for insert to authenticated with check(owner_id=auth.uid() and public.is_member() and status='DRAFT' and not verified and plan_id is null and average_rating=0 and reviews_count=0 and rejection_reason is null and deleted_at is null);
create policy company_owner_update on public.companies for update to authenticated using(public.owns_company(id) and status<>'SUSPENDED') with check(owner_id=auth.uid());
-- Physical deletion is deliberately unavailable to owners; API soft deletion is audited by a guarded function.

do $$ declare t text; begin
 foreach t in array array['company_categories','company_services','company_hours','promotions'] loop
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy owner_manage on public.%I to authenticated using(public.owns_company(company_id)) with check(public.owns_company(company_id))',t);
 end loop;
 foreach t in array array['company_categories','company_services','company_hours','company_images','promotions'] loop
 execute format('grant select on public.%I to anon,authenticated',t);
 end loop;
end $$;
create policy public_categories on public.company_categories for select to anon,authenticated using(public.company_public(company_id));
create policy public_services on public.company_services for select to anon,authenticated using(public.company_public(company_id) and is_active and (select (limits->>'services')::int from public.plans where id=public.effective_plan(company_id))>0);
create policy public_hours on public.company_hours for select to anon,authenticated using(public.company_public(company_id));
create policy public_images on public.company_images for select to anon,authenticated using(public.company_public(company_id));
create policy owner_images on public.company_images for select to authenticated using(public.owns_company(company_id));
create policy public_promotions on public.promotions for select to anon,authenticated using(public.company_public(company_id) and is_active and starts_at<=now() and ends_at>now() and (select (limits->>'promotions')::int from public.plans where id=public.effective_plan(company_id))>0);
grant select on public.subscriptions,public.payments,public.interaction_events,public.admin_audit_logs to authenticated;
create policy own_subscriptions on public.subscriptions for select to authenticated using(public.owns_company(company_id));
create policy own_payments on public.payments for select to authenticated using(public.owns_company(company_id));
-- Events are aggregated by backend: owners cannot bypass their plan's history limit via REST.

create function public.company_transition(cid uuid, target public.company_status, reason text default null) returns void
 language plpgsql security definer set search_path=public as $$
declare c public.companies;
begin
 select * into c from public.companies where id=cid and deleted_at is null for update;
 if not found then raise exception 'Company not found' using errcode='P0002'; end if;
 if not public.is_admin() then
  if not public.owns_company(cid) then raise exception 'Forbidden' using errcode='42501'; end if;
  if target<>'PENDING_APPROVAL' or c.status not in ('DRAFT','REJECTED') then raise exception 'Invalid transition' using errcode='23514'; end if;
 else
  if target not in ('ACTIVE','REJECTED','SUSPENDED') then raise exception 'Invalid admin transition' using errcode='23514'; end if;
  if target in ('ACTIVE','REJECTED') and c.status<>'PENDING_APPROVAL' then raise exception 'Company must be pending' using errcode='23514'; end if;
  if target='REJECTED' and length(trim(coalesce(reason,'')))<3 then raise exception 'Reason required' using errcode='23514'; end if;
 end if;
 if target='PENDING_APPROVAL' and (c.whatsapp is null or c.street is null or not exists(select 1 from public.company_categories where company_id=cid)) then
  raise exception 'Address, WhatsApp and category required' using errcode='23514'; end if;
 update public.companies set status=target,rejection_reason=case when target='REJECTED' then reason else null end where id=cid;
 if public.is_admin() then insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),case target when 'ACTIVE' then 'COMPANY_APPROVED' when 'REJECTED' then 'COMPANY_REJECTED' else 'COMPANY_SUSPENDED' end,'company',cid,jsonb_build_object('reason',reason)); end if;
end $$;
create function public.delete_company(cid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.owns_company(cid) and not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if exists(select 1 from public.subscriptions where company_id=cid and status in ('PENDING','ACTIVE','PAST_DUE')) then raise exception 'Cancel subscription first' using errcode='23514'; end if;
 update public.companies set deleted_at=now(),status='SUSPENDED' where id=cid;
end $$;
create function public.promote_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.profiles set role='COMPANY_OWNER' where id=new.owner_id and role='USER'; return new; end $$;
create trigger company_promotes_owner after insert on public.companies for each row execute function public.promote_owner();

-- Enforce plan quotas even when authenticated callers bypass Express and use Supabase REST.
create function public.enforce_resource_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare lim int; used int; cid uuid; key text;
begin
 cid=new.company_id;
 if tg_op='UPDATE' and new.company_id<>old.company_id then raise exception 'Cannot move resource' using errcode='42501'; end if;
 perform 1 from public.companies where id=cid and deleted_at is null and status<>'SUSPENDED' for update;
 if not found then raise exception 'Company unavailable' using errcode='23514'; end if;
 key=case tg_table_name when 'company_categories' then 'categories' when 'company_services' then 'services' when 'company_images' then 'photos' else 'promotions' end;
 select (limits->>key)::int into lim from public.plans where id=public.effective_plan(cid);
 if tg_table_name='company_categories' then
  if not exists(select 1 from public.categories where id=new.category_id and is_active) then raise exception 'Inactive category' using errcode='23514'; end if;
 end if;
 if tg_op='INSERT' then
  execute format('select count(*) from public.%I where company_id=$1',tg_table_name) into used using cid;
  if used>=coalesce(lim,0) then raise exception 'Plan limit reached' using errcode='23514'; end if;
 elsif coalesce(lim,0)=0 then raise exception 'Plan feature unavailable' using errcode='23514'; end if;
 return new;
end $$;
do $$ declare t text; begin foreach t in array array['company_categories','company_services','company_images','promotions'] loop
 execute format('create trigger quota before insert or update on public.%I for each row execute function public.enforce_resource_limit()',t);
end loop; end $$;

-- Function execution is explicit, not granted to PUBLIC by default.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.is_member(),public.owns_company(uuid),public.company_public(uuid),public.effective_plan(uuid),public.company_open(uuid,timestamptz) to anon,authenticated,service_role;
grant execute on function public.company_transition(uuid,public.company_status,text),public.delete_company(uuid) to authenticated,service_role;
grant execute on all functions in schema public to service_role;
