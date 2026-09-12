-- Each account may own at most one active company profile.
create unique index companies_one_per_owner on public.companies(owner_id) where owner_id is not null and deleted_at is null;

create or replace function public.create_company_claim(cid uuid, msg text default null) returns public.company_claims
 language plpgsql security definer set search_path=public as $$
declare c public.companies; result public.company_claims;
begin
 if not public.is_member() then raise exception 'Forbidden' using errcode='42501'; end if;
 if exists(select 1 from public.companies where owner_id=auth.uid() and deleted_at is null) then
  raise exception 'Account already owns a company' using errcode='23505';
 end if;
 select * into c from public.companies where id=cid and deleted_at is null for update;
 if not found then raise exception 'Company not found' using errcode='P0002'; end if;
 if c.owner_id is not null then raise exception 'Company already claimed' using errcode='23514'; end if;
 if exists(select 1 from public.company_claims where company_id=cid and user_id=auth.uid() and status='PENDING') then
  raise exception 'Claim already pending' using errcode='23514';
 end if;
 insert into public.company_claims(company_id,user_id,message) values(cid,auth.uid(),msg) returning * into result;
 return result;
end $$;

create or replace function public.approve_company_claim(claim_id uuid) returns public.companies
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
 if exists(select 1 from public.companies where owner_id=claim.user_id and deleted_at is null) then
  raise exception 'Account already owns a company' using errcode='23505';
 end if;
 update public.company_claims set status='APPROVED',reviewed_at=now(),reviewed_by=auth.uid() where id=claim_id;
 update public.companies set owner_id=claim.user_id where id=claim.company_id returning * into company;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'COMPANY_CLAIM_APPROVED','company_claim',claim_id,jsonb_build_object('company_id',claim.company_id,'user_id',claim.user_id));
 return company;
end $$;
