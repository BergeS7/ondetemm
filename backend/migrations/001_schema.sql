create extension if not exists pgcrypto;
create type public.user_role as enum ('USER','COMPANY_OWNER','ADMIN');
create type public.profile_status as enum ('ACTIVE','SUSPENDED');
create type public.company_status as enum ('DRAFT','PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED');
create type public.price_type as enum ('FIXED','STARTING_AT','CONTACT');
create type public.image_type as enum ('LOGO','COVER','GALLERY','SERVICE','PROMOTION');
create type public.subscription_status as enum ('PENDING','ACTIVE','PAST_DUE','CANCELED','EXPIRED');
create type public.event_type as enum ('PROFILE_VIEW','WHATSAPP_CLICK','PHONE_CLICK','INSTAGRAM_CLICK','WEBSITE_CLICK','ROUTE_CLICK','PROMOTION_CLICK');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 120), email text not null,
 phone text, avatar_url text, role public.user_role not null default 'USER',
 status public.profile_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.countries (id uuid primary key default gen_random_uuid(), name text not null, code text not null unique);
create table public.states (id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries, name text not null, code text not null unique check(length(code)=2));
create table public.cities (
 id uuid primary key default gen_random_uuid(), state_id uuid not null references public.states,
 name text not null, slug text not null, ibge_code text unique, is_active boolean not null default true,
 timezone text not null default 'America/Fortaleza', unique(state_id,slug), unique(id,state_id)
);
create table public.neighborhoods (id uuid primary key default gen_random_uuid(), city_id uuid not null references public.cities, name text not null, slug text not null, unique(city_id,slug), unique(id,city_id));
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, icon text,
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.plans (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code in ('FREE','FEATURED','PREMIUM')),
 name text not null, description text not null, price_monthly numeric(12,2) not null check(price_monthly>=0),
 is_active boolean not null default true, limits jsonb not null, ranking_weight numeric not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.companies (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.profiles,
 name text not null check(length(name) between 2 and 160), slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 legal_name text, cnpj text, short_description text not null, description text not null,
 email text, phone text, whatsapp text, website text, instagram text,
 state_id uuid not null references public.states, city_id uuid not null,
 neighborhood_id uuid, neighborhood text, street text, number text, complement text, zipcode text,
 latitude numeric check(latitude between -90 and 90), longitude numeric check(longitude between -180 and 180),
 logo_url text, cover_url text, keywords text[] not null default '{}',
 status public.company_status not null default 'DRAFT', verified boolean not null default false,
 plan_id uuid references public.plans, average_rating numeric not null default 0 check(average_rating between 0 and 5),
 reviews_count integer not null default 0 check(reviews_count>=0), rejection_reason text, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(city_id,slug), foreign key(city_id,state_id) references public.cities(id,state_id),
 foreign key(neighborhood_id,city_id) references public.neighborhoods(id,city_id)
);
create table public.company_categories (company_id uuid not null references public.companies on delete cascade, category_id uuid not null references public.categories, primary key(company_id,category_id));
create table public.company_services (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies on delete cascade,
 name text not null, description text, price numeric(12,2) check(price>=0), price_type public.price_type not null default 'CONTACT',
 image_url text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((price_type='CONTACT' and price is null) or (price_type<>'CONTACT' and price is not null))
);
create table public.company_hours (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies on delete cascade,
 day_of_week smallint not null check(day_of_week between 0 and 6), opens_at time, closes_at time, is_closed boolean not null default false,
 check((is_closed and opens_at is null and closes_at is null) or (not is_closed and opens_at is not null and closes_at is not null and opens_at<>closes_at)),
 unique(company_id,day_of_week,opens_at)
);
create table public.company_images (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies on delete cascade,
 url text not null, storage_path text not null unique, type public.image_type not null, sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create unique index company_single_logo_cover on public.company_images(company_id,type) where type in ('LOGO','COVER');
create table public.promotions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies on delete cascade,
 title text not null, description text, original_price numeric(12,2) check(original_price>=0), promotional_price numeric(12,2) check(promotional_price>=0),
 image_url text, starts_at timestamptz not null, ends_at timestamptz not null, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(ends_at>starts_at),
 check(original_price is null or promotional_price is null or promotional_price<=original_price)
);
create table public.subscriptions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
 plan_id uuid not null references public.plans, provider text not null default 'MERCADO_PAGO',
 provider_subscription_id text unique, status public.subscription_status not null default 'PENDING',
 current_period_start timestamptz, current_period_end timestamptz, cancel_at_period_end boolean not null default false,
 checkout_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_live_subscription on public.subscriptions(company_id) where status in ('PENDING','ACTIVE','PAST_DUE');
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), provider text not null, event_id text not null unique,
 event_type text not null, payload jsonb not null, processed_at timestamptz, created_at timestamptz not null default now()
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
 subscription_id uuid references public.subscriptions, provider text not null, provider_payment_id text not null,
 amount numeric(12,2) not null check(amount>=0), currency text not null, status text not null, paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,provider_payment_id)
);
create table public.interaction_events (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
 user_id uuid references public.profiles on delete set null, event_type public.event_type not null,
 session_id text, ip_hash text, user_agent_hash text, metadata jsonb,
 created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
 id uuid primary key default gen_random_uuid(), admin_id uuid references public.profiles, action text not null,
 entity_type text not null, entity_id uuid not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create index companies_status_city on public.companies(city_id,status) where deleted_at is null;
create index companies_owner on public.companies(owner_id);
create index companies_slug on public.companies(slug);
create index categories_company on public.company_categories(category_id,company_id);
create index services_company on public.company_services(company_id);
create index hours_company on public.company_hours(company_id);
create index images_company on public.company_images(company_id,sort_order);
create index promotions_active on public.promotions(company_id,ends_at) where is_active;
create index subscriptions_company on public.subscriptions(company_id,current_period_end);
create index events_company_time on public.interaction_events(company_id,created_at desc);
create index events_time on public.interaction_events(created_at);
create index events_dedup on public.interaction_events(company_id,event_type,session_id,created_at desc);
create index events_network_dedup on public.interaction_events(company_id,event_type,ip_hash,user_agent_hash,created_at desc);
create index companies_text on public.companies using gin(to_tsvector('portuguese',name || ' ' || description || ' ' || coalesce(neighborhood,'')));

create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','companies','categories','plans','company_services','promotions','subscriptions','payments'] loop
 execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()',t);
end loop; end $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Usuário'),120),coalesce(new.email,''));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.sync_auth_email() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.profiles set email=coalesce(new.email,'') where id=new.id; return new; end $$;
create trigger on_auth_email_updated after update of email on auth.users for each row execute function public.sync_auth_email();
