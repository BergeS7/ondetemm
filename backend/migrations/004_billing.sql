alter table public.subscriptions add column amount numeric(12,2) not null default 0 check(amount>=0);
alter table public.subscriptions add column currency text not null default 'BRL' check(currency='BRL');
alter table public.subscriptions add column provider_updated_at timestamptz;
alter table public.payments add column period_start timestamptz;
alter table public.payments add column period_end timestamptz;
alter table public.payments add column provider_updated_at timestamptz;
create index payment_subscription_period on public.payments(subscription_id,period_end desc);
