-- Additive migration: admin reactivation (users/companies) and a real reviews system.
-- No destructive changes; existing data and behavior are preserved.

-- Allow an admin to move a SUSPENDED company back to ACTIVE, in addition to the existing
-- PENDING_APPROVAL -> ACTIVE approval path. Everything else in company_transition is unchanged.
create or replace function public.company_transition(cid uuid, target public.company_status, reason text default null) returns void
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
  if target='ACTIVE' and c.status not in ('PENDING_APPROVAL','SUSPENDED') then raise exception 'Company must be pending or suspended' using errcode='23514'; end if;
  if target='REJECTED' and c.status<>'PENDING_APPROVAL' then raise exception 'Company must be pending' using errcode='23514'; end if;
  if target='REJECTED' and length(trim(coalesce(reason,'')))<3 then raise exception 'Reason required' using errcode='23514'; end if;
 end if;
 if target='PENDING_APPROVAL' and (c.whatsapp is null or c.street is null or not exists(select 1 from public.company_categories where company_id=cid)) then
  raise exception 'Address, WhatsApp and category required' using errcode='23514'; end if;
 update public.companies set status=target,rejection_reason=case when target='REJECTED' then reason else null end where id=cid;
 if public.is_admin() then insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),
   case target
     when 'ACTIVE' then (case when c.status='SUSPENDED' then 'COMPANY_REACTIVATED' else 'COMPANY_APPROVED' end)
     when 'REJECTED' then 'COMPANY_REJECTED'
     else 'COMPANY_SUSPENDED' end,
   'company',cid,jsonb_build_object('reason',reason)); end if;
end $$;

create function public.reactivate_profile(uid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 update public.profiles set status='ACTIVE' where id=uid;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'USER_REACTIVATED','user',uid,'{}'::jsonb);
end $$;
grant execute on function public.reactivate_profile(uuid) to authenticated,service_role;

-- Reviews: one review per (company, user); public read on published companies, owners
-- manage only their own review, a company can't review itself.
create table public.reviews (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 comment text check(comment is null or length(comment)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(company_id,user_id)
);
create index reviews_company on public.reviews(company_id,created_at desc);
alter table public.reviews enable row level security;
grant select,insert,update,delete on public.reviews to authenticated;
grant select on public.reviews to anon;

create policy public_reviews_read on public.reviews for select to anon,authenticated using(public.company_public(company_id));
create policy insert_own_review on public.reviews for insert to authenticated with check(
 user_id=auth.uid() and public.is_member() and public.company_public(company_id)
 and not exists(select 1 from public.companies where id=company_id and owner_id=auth.uid())
);
create policy update_own_review on public.reviews for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy delete_own_review on public.reviews for delete to authenticated using(user_id=auth.uid() or public.is_admin());

create function public.touch_review() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_review();

create function public.refresh_company_rating() returns trigger language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
 cid := coalesce(new.company_id,old.company_id);
 update public.companies set
  average_rating=coalesce((select round(avg(rating)::numeric,2) from public.reviews where company_id=cid),0),
  reviews_count=(select count(*) from public.reviews where company_id=cid)
 where id=cid;
 return null;
end $$;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews for each row execute function public.refresh_company_rating();

-- Reviewer name only (never email) alongside the review, for public display.
create view public.public_reviews with (security_barrier=true) as
 select r.id,r.company_id,r.rating,r.comment,r.created_at,r.user_id,p.name as reviewer_name
 from public.reviews r join public.profiles p on p.id=r.user_id
 where public.company_public(r.company_id)
 order by r.created_at desc;
grant select on public.public_reviews to anon,authenticated,service_role;
