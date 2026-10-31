-- Meshlyy retailer inventory MVP — run in Supabase SQL Editor.
-- Never put a service-role key in the browser.
create extension if not exists pgcrypto;

create table if not exists public.retailer_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  address text,
  locality text,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.store_inventory (
  store_id uuid not null references public.retailer_stores(id) on delete cascade,
  product_id text not null,
  price numeric(12,2) not null check (price > 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (store_id, product_id)
);

create index if not exists retailer_stores_owner_idx on public.retailer_stores(owner_id);
create index if not exists store_inventory_product_idx on public.store_inventory(product_id);

alter table public.retailer_stores enable row level security;
alter table public.store_inventory enable row level security;

drop policy if exists "Retailer reads own stores" on public.retailer_stores;
create policy "Retailer reads own stores" on public.retailer_stores for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Retailer creates own stores" on public.retailer_stores;
create policy "Retailer creates own stores" on public.retailer_stores for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Retailer updates own stores" on public.retailer_stores;
create policy "Retailer updates own stores" on public.retailer_stores for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "Retailer reads own inventory" on public.store_inventory;
create policy "Retailer reads own inventory" on public.store_inventory for select to authenticated
using (exists (select 1 from public.retailer_stores s where s.id = store_id and s.owner_id = (select auth.uid())));
drop policy if exists "Retailer adds own inventory" on public.store_inventory;
create policy "Retailer adds own inventory" on public.store_inventory for insert to authenticated
with check (exists (select 1 from public.retailer_stores s where s.id = store_id and s.owner_id = (select auth.uid())));
drop policy if exists "Retailer edits own inventory" on public.store_inventory;
create policy "Retailer edits own inventory" on public.store_inventory for update to authenticated
using (exists (select 1 from public.retailer_stores s where s.id = store_id and s.owner_id = (select auth.uid())))
with check (exists (select 1 from public.retailer_stores s where s.id = store_id and s.owner_id = (select auth.uid())));
drop policy if exists "Retailer deletes own inventory" on public.store_inventory;
create policy "Retailer deletes own inventory" on public.store_inventory for delete to authenticated
using (exists (select 1 from public.retailer_stores s where s.id = store_id and s.owner_id = (select auth.uid())));

-- Consumer discovery requires a separate public view/API with verified store locations.
-- Do not expose inventory through anonymous RLS policies until that is built.
