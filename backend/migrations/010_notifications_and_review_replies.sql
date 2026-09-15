-- Additive migration: in-app notifications and owner replies to reviews.
-- No destructive changes; existing data and behavior are preserved.

create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 type text not null,
 title text not null,
 body text,
 entity_type text,
 entity_id uuid,
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index notifications_user on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;
grant select,update on public.notifications to authenticated;
grant select,insert,update,delete on public.notifications to service_role;
create policy own_notifications_read on public.notifications for select to authenticated using(user_id=auth.uid());
create policy own_notifications_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create function public.notify(uid uuid, ntype text, title text, body text, etype text default null, eid uuid default null) returns void
 language sql security definer set search_path=public as $$
 insert into public.notifications(user_id,type,title,body,entity_type,entity_id) values(uid,ntype,title,body,etype,eid)
$$;
grant execute on function public.notify(uuid,text,text,text,text,uuid) to authenticated,service_role;

-- Notify the owner on every admin-driven status change, in addition to the existing audit log.
create or replace function public.company_transition(cid uuid, target public.company_status, reason text default null) returns void
 language plpgsql security definer set search_path=public as $$
declare c public.companies; action_label text; notif_title text; notif_body text;
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
 if target='ACTIVE' and c.status='SUSPENDED' then action_label:='COMPANY_REACTIVATED';
 elsif target='ACTIVE' then action_label:='COMPANY_APPROVED';
 elsif target='REJECTED' then action_label:='COMPANY_REJECTED';
 else action_label:='COMPANY_SUSPENDED'; end if;
 update public.companies set status=target,rejection_reason=case when target='REJECTED' then reason else null end where id=cid;
 if public.is_admin() then
  insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),action_label,'company',cid,jsonb_build_object('reason',reason));
  if c.owner_id is not null then
   notif_title := case action_label
     when 'COMPANY_REACTIVATED' then 'Sua empresa foi reativada'
     when 'COMPANY_APPROVED' then 'Sua empresa foi aprovada!'
     when 'COMPANY_REJECTED' then 'Sua empresa precisa de ajustes'
     else 'Sua empresa foi suspensa' end;
   notif_body := case action_label
     when 'COMPANY_REJECTED' then coalesce(reason,'Confira os detalhes no painel.')
     when 'COMPANY_SUSPENDED' then 'Entre em contato com a administração para mais detalhes.'
     else format('%s já está disponível na busca.',c.name) end;
   perform public.notify(c.owner_id,action_label,notif_title,notif_body,'company',cid);
  end if;
 end if;
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
 perform public.notify(claim.user_id,'COMPANY_CLAIM_APPROVED','Reivindicação aprovada',
   format('Você agora é o responsável por %s.',company.name),'company',company.id);
 return company;
end $$;

create or replace function public.reject_company_claim(claim_id uuid, reason text default null) returns public.company_claims
 language plpgsql security definer set search_path=public as $$
declare claim public.company_claims; company_name text;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into claim from public.company_claims where id=claim_id for update;
 if not found then raise exception 'Claim not found' using errcode='P0002'; end if;
 if claim.status<>'PENDING' then raise exception 'Claim already reviewed' using errcode='23514'; end if;
 update public.company_claims set status='REJECTED',rejection_reason=reason,reviewed_at=now(),reviewed_by=auth.uid() where id=claim_id returning * into claim;
 insert into public.admin_audit_logs(admin_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'COMPANY_CLAIM_REJECTED','company_claim',claim_id,jsonb_build_object('company_id',claim.company_id,'reason',reason));
 select name into company_name from public.companies where id=claim.company_id;
 perform public.notify(claim.user_id,'COMPANY_CLAIM_REJECTED','Reivindicação não aprovada',
   coalesce(reason,format('Não foi possível confirmar sua propriedade sobre %s.',company_name)),'company',claim.company_id);
 return claim;
end $$;

-- Owner replies to a review, without ever touching the reviewer's own rating/comment.
alter table public.reviews add column owner_reply text check(owner_reply is null or length(owner_reply)<=2000);
alter table public.reviews add column owner_reply_at timestamptz;
create function public.reply_to_review(rid uuid, reply text default null) returns public.reviews
 language plpgsql security definer set search_path=public as $$
declare r public.reviews; trimmed text;
begin
 select * into r from public.reviews where id=rid for update;
 if not found then raise exception 'Review not found' using errcode='P0002'; end if;
 if not exists(select 1 from public.companies where id=r.company_id and owner_id=auth.uid()) then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 trimmed := nullif(trim(coalesce(reply,'')),'');
 update public.reviews set owner_reply=trimmed,owner_reply_at=case when trimmed is null then null else now() end
  where id=rid returning * into r;
 return r;
end $$;
grant execute on function public.reply_to_review(uuid,text) to authenticated,service_role;

-- Reflect owner_reply/owner_reply_at in the public reviews view.
create or replace view public.public_reviews with (security_barrier=true) as
 select r.id,r.company_id,r.rating,r.comment,r.created_at,r.user_id,p.name as reviewer_name,
   r.owner_reply,r.owner_reply_at
 from public.reviews r join public.profiles p on p.id=r.user_id
 where public.company_public(r.company_id)
 order by r.created_at desc;

create function public.notify_new_review() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; company_name text; reviewer_name text;
begin
 select owner_id,name into owner,company_name from public.companies where id=new.company_id;
 if owner is not null and owner<>new.user_id then
  select name into reviewer_name from public.profiles where id=new.user_id;
  perform public.notify(owner,'NEW_REVIEW',format('Nova avaliação em %s',company_name),
    format('%s avaliou sua empresa com %s estrela(s).',coalesce(reviewer_name,'Um cliente'),new.rating),
    'review',new.id);
 end if;
 return new;
end $$;
create trigger reviews_notify_owner after insert on public.reviews for each row execute function public.notify_new_review();
