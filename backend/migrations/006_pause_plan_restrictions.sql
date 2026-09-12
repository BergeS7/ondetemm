-- Temporarily operate without subscription feature restrictions.
-- Retain ownership, company availability, category and resource-move checks.
create or replace function public.enforce_resource_limit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and new.company_id<>old.company_id then
  raise exception 'Cannot move resource' using errcode='42501';
 end if;
 perform 1 from public.companies where id=new.company_id and deleted_at is null and status<>'SUSPENDED' for update;
 if not found then raise exception 'Company unavailable' using errcode='23514'; end if;
 if tg_table_name='company_categories' then
  if not exists(select 1 from public.categories where id=new.category_id and is_active) then
   raise exception 'Inactive category' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
drop policy public_services on public.company_services;
create policy public_services on public.company_services for select to anon,authenticated using(public.company_public(company_id) and is_active);
drop policy public_promotions on public.promotions;
create policy public_promotions on public.promotions for select to anon,authenticated using(public.company_public(company_id) and is_active and starts_at<=now() and ends_at>now());
