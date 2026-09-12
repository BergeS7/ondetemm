create table public.company_claims (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies on delete cascade,
 user_id uuid not null references public.profiles,
 message text,
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 rejection_reason text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.profiles
);
create unique index company_claims_one_pending on public.company_claims(company_id,user_id) where status='PENDING';
create index company_claims_company on public.company_claims(company_id);
create index company_claims_status on public.company_claims(status,created_at);

alter table public.company_claims enable row level security;
revoke all on public.company_claims from anon, authenticated;
grant all on public.company_claims to service_role;
create policy admin_all on public.company_claims to authenticated using (public.is_admin()) with check (public.is_admin());
grant select,insert on public.company_claims to authenticated;
create policy own_claims_read on public.company_claims for select to authenticated using(user_id=auth.uid());
create policy own_claims_insert on public.company_claims for insert to authenticated with check(user_id=auth.uid() and status='PENDING' and rejection_reason is null and reviewed_at is null and reviewed_by is null);

-- Expose whether a public listing is already claimed, without leaking owner PII.
create or replace view public.public_companies with (security_barrier=true) as
 select c.id,c.name,c.slug,c.short_description,c.description,c.phone,c.whatsapp,c.website,c.instagram,
 c.state_id,c.city_id,c.neighborhood,c.street,c.number,c.complement,c.zipcode,c.latitude,c.longitude,
 c.logo_url,c.cover_url,c.keywords,c.verified,c.average_rating,c.reviews_count,c.created_at,c.updated_at,
 s.code as state_code,ci.name as city_name,ci.slug as city_slug,ci.timezone,
 p.code as plan_code,p.ranking_weight,(p.code<>'FREE') as is_sponsored,
 public.company_open(c.id) as is_open,
 least(1.0,(case when c.description<>'' then 1 else 0 end + case when c.whatsapp is not null then 1 else 0 end + case when c.street is not null then 1 else 0 end + case when c.logo_url is not null then 1 else 0 end)/4.0) as completeness,
 (select count(*) from public.interaction_events e where e.company_id=c.id and e.created_at>now()-interval '30 days') as popularity,
 (c.owner_id is not null) as is_claimed
 from public.companies c join public.states s on s.id=c.state_id join public.cities ci on ci.id=c.city_id
 join public.plans p on p.id=public.effective_plan(c.id)
 where c.status='ACTIVE' and c.deleted_at is null and ci.is_active;
grant select on public.public_companies to anon,authenticated,service_role;

-- Business rules for claims are enforced in the database so Express and any direct
-- Supabase REST access share the same invariants (mirrors public.company_transition).
create function public.create_company_claim(cid uuid, msg text default null) returns public.company_claims
 language plpgsql security definer set search_path=public as $$
declare c public.companies; result public.company_claims;
begin
 if not public.is_member() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into c from public.companies where id=cid and deleted_at is null for update;
 if not found then raise exception 'Company not found' using errcode='P0002'; end if;
 if c.owner_id is not null then raise exception 'Company already claimed' using errcode='23514'; end if;
 if exists(select 1 from public.company_claims where company_id=cid and user_id=auth.uid() and status='PENDING') then
  raise exception 'Claim already pending' using errcode='23514';
 end if;
 insert into public.company_claims(company_id,user_id,message) values(cid,auth.uid(),msg) returning * into result;
 return result;
end $$;

create function public.approve_company_claim(claim_id uuid) returns public.companies
 language plpgsql security definer set search_path=public as $$
declare claim public.company_claims; company public.companies;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into claim from public.company_claims where id=claim_id for update;
 if not found then raise exception 'Claim not found' using errcode='P0002'; end if;
 if claim.status<>'PENDING' then raise exception 'Claim already reviewed' using errcode='23514'; end if;
 select * into company from public.companies where id=claim.company_id and deleted_at is null for update;
 if not found then raise exception 'Company not found' using errcode='P0002'; end if;
 if company.owner_id is not null then raise exception 'Company already claimed' using errcode='23514'; end if;
 update public.company_claims set status='APPROVED',reviewed_at=now(),reviewed_by=auth.uid() where id=claim_id;
 update public.companies set owner_id=claim.user_id where id=claim.company_id returning * into company;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'COMPANY_CLAIM_APPROVED','company_claim',claim_id,jsonb_build_object('company_id',claim.company_id,'user_id',claim.user_id));
 return company;
end $$;

create function public.reject_company_claim(claim_id uuid, reason text default null) returns public.company_claims
 language plpgsql security definer set search_path=public as $$
declare claim public.company_claims;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into claim from public.company_claims where id=claim_id for update;
 if not found then raise exception 'Claim not found' using errcode='P0002'; end if;
 if claim.status<>'PENDING' then raise exception 'Claim already reviewed' using errcode='23514'; end if;
 update public.company_claims set status='REJECTED',rejection_reason=reason,reviewed_at=now(),reviewed_by=auth.uid() where id=claim_id returning * into claim;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'COMPANY_CLAIM_REJECTED','company_claim',claim_id,jsonb_build_object('company_id',claim.company_id,'reason',reason));
 return claim;
end $$;

grant execute on function public.create_company_claim(uuid,text) to authenticated,service_role;
grant execute on function public.approve_company_claim(uuid),public.reject_company_claim(uuid,text) to authenticated,service_role;
