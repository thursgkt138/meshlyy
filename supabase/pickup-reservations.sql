-- Meshlyy pickup reservations v1. Run after supabase/retailer-inventory.sql.
-- Consumer creation and pickup verification are NOT enabled in this migration.
create table if not exists public.pickup_reservations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.retailer_stores(id),
  customer_id uuid not null references auth.users(id),
  status text not null default 'requested' check (status in ('requested','accepted','rejected','expired','completed','cancelled')),
  pickup_minutes integer not null default 20 check (pickup_minutes between 15 and 25),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.pickup_reservation_items (
  reservation_id uuid not null references public.pickup_reservations(id) on delete cascade,
  product_id text not null,
  quantity integer not null check (quantity > 0),
  price_at_request numeric(12,2) not null check (price_at_request > 0),
  primary key (reservation_id,product_id)
);
create index if not exists pickup_reservations_store_status_idx on public.pickup_reservations(store_id,status,requested_at desc);
create index if not exists pickup_reservations_customer_idx on public.pickup_reservations(customer_id);
alter table public.pickup_reservations enable row level security;
alter table public.pickup_reservation_items enable row level security;

drop policy if exists "Retailer views shop reservations" on public.pickup_reservations;
create policy "Retailer views shop reservations" on public.pickup_reservations for select to authenticated
using (exists(select 1 from public.retailer_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
drop policy if exists "Retailer views reservation items" on public.pickup_reservation_items;
create policy "Retailer views reservation items" on public.pickup_reservation_items for select to authenticated
using (exists(select 1 from public.pickup_reservations r join public.retailer_stores s on s.id=r.store_id where r.id=reservation_id and s.owner_id=(select auth.uid())));
-- No direct INSERT/UPDATE/DELETE policies: all transitions must use validated server-side functions.

create or replace function public.retailer_reservation_action(p_reservation_id uuid,p_action text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.pickup_reservations%rowtype;
declare line record;
declare changed integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_action not in ('accept','reject','expire') then raise exception 'Unsupported action'; end if;
  select * into v from public.pickup_reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if not exists(select 1 from public.retailer_stores where id=v.store_id and owner_id=auth.uid()) then
    raise exception 'Not authorized for this shop';
  end if;
  if p_action='expire' then
    if v.status<>'accepted' or v.expires_at>now() then raise exception 'Not eligible for expiry'; end if;
    for line in select * from public.pickup_reservation_items where reservation_id=v.id order by product_id loop
      update public.store_inventory set stock=stock+line.quantity,updated_at=now()
      where store_id=v.store_id and product_id=line.product_id;
    end loop;
    update public.pickup_reservations set status='expired',updated_at=now() where id=v.id;
    return 'expired';
  end if;
  if v.status<>'requested' then raise exception 'Reservation is no longer pending'; end if;
  if p_action='reject' then
    update public.pickup_reservations set status='rejected',updated_at=now() where id=v.id;
    return 'rejected';
  end if;
  if not exists(select 1 from public.pickup_reservation_items where reservation_id=v.id) then
    raise exception 'Reservation has no items';
  end if;
  for line in select * from public.pickup_reservation_items where reservation_id=v.id order by product_id loop
    update public.store_inventory set stock=stock-line.quantity,updated_at=now()
    where store_id=v.store_id and product_id=line.product_id and active=true and stock>=line.quantity;
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Insufficient stock for product %',line.product_id; end if;
  end loop;
  update public.pickup_reservations set status='accepted',accepted_at=now(),
    expires_at=now()+make_interval(mins=>v.pickup_minutes),updated_at=now() where id=v.id;
  return 'accepted';
end $$;
revoke all on function public.retailer_reservation_action(uuid,text) from public,anon;
grant execute on function public.retailer_reservation_action(uuid,text) to authenticated;
-- Expiry currently requires an authorized retailer to trigger it; add a scheduled
-- server-side expiry job before enabling consumer checkout. Do not rely on an open browser tab.
-- A separate verified OTP/QR completion function is required before completing pickups.
