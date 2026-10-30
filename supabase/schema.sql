-- pica-pica: cloud schema. Run once in the Supabase SQL editor.
-- Every row belongs to one user and Row Level Security only lets that user touch it,
-- which is what makes it safe to ship the publishable key in the browser.
-- Ids are generated on the device (offline-first), hence text keys scoped by user_id.

create table if not exists public.expenses (
  user_id          uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id               text        not null,
  what             text        not null,
  amount_minor     bigint      not null check (amount_minor > 0),
  currency         text        not null check (currency ~ '^[A-Z]{3}$'),
  category_id      text        not null,
  payment_method_id text       not null,
  place            text,
  place_key        text,
  occurred_at      timestamptz not null,
  occurred_day     date        not null,
  note             text,
  created_at       timestamptz not null,
  updated_at       timestamptz not null,
  deleted_at       timestamptz,
  primary key (user_id, id)
);

create table if not exists public.categories (
  user_id   uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id        text    not null,
  name      text    not null,
  emoji     text    not null,
  color     text    not null,
  archived  boolean not null default false,
  position  integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.payment_methods (
  user_id   uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id        text    not null,
  name      text    not null,
  kind      text    not null,
  archived  boolean not null default false,
  position  integer not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row per user.
create table if not exists public.settings (
  user_id                uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  default_currency       text    not null check (default_currency ~ '^[A-Z]{3}$'),
  ant_threshold_minor    bigint  not null check (ant_threshold_minor >= 0),
  ant_threshold_currency text    not null check (ant_threshold_currency ~ '^[A-Z]{3}$'),
  theme                  text    not null check (theme in ('system', 'light', 'dark')),
  updated_at             timestamptz not null default now()
);

-- Pulling "what changed since my last sync" must be cheap.
create index if not exists expenses_user_updated_idx on public.expenses (user_id, updated_at);
create index if not exists categories_user_updated_idx on public.categories (user_id, updated_at);
create index if not exists payment_methods_user_updated_idx on public.payment_methods (user_id, updated_at);

alter table public.expenses        enable row level security;
alter table public.categories      enable row level security;
alter table public.payment_methods enable row level security;
alter table public.settings        enable row level security;

-- (select auth.uid()) is evaluated once per statement instead of once per row.
do $$
declare t text;
begin
  foreach t in array array['expenses', 'categories', 'payment_methods', 'settings'] loop
    execute format('drop policy if exists "owner full access" on public.%I', t);
    execute format(
      'create policy "owner full access" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
