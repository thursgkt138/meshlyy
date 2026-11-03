-- Run in Meshlyy Supabase SQL Editor before enabling the retailer cancel button.
-- A cancelled accepted reservation becomes 'rejected' to remain compatible with existing status filters.
create table if not exists public.pickup_cancellation_reasons (
 reservation_id uuid primary key references public.pickup_reservations(id) on delete cascade,
 reason text not null check (char_length(btrim(reason)) between 5 and 300),
 cancelled_by uuid not null references auth.users(id),
 cancelled_at timestamptz not null default now()
);
alter table public.pickup_cancellation_reasons enable row level security;
revoke all on public.pickup_cancellation_reasons from anon,authenticated;
create or replace function public.cancel_accepted_pickup(p_reservation_id uuid,p_reason text)
returns text language plpgsql security definer set search_path='' as $fn$
declare v_res public.pickup_reservations%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 5 and 300 then raise exception 'Enter a cancellation reason (5–300 characters)'; end if;
 select * into v_res from public.pickup_reservations r where r.id=p_reservation_id for update;
 if not found then raise exception 'Order not found'; end if;
 if not exists(select 1 from public.retailer_stores s where s.id=v_res.store_id and s.owner_id=auth.uid()) then
  raise exception 'Not authorized for this shop';
 end if;
 if v_res.status <> 'accepted' then raise exception 'Only accepted orders can be cancelled'; end if;
 if v_res.expires_at is null or v_res.expires_at <= now() then raise exception 'Pickup window has expired; refresh the order'; end if;
 -- Serialize with competing inventory updates; only return stock once.
 update public.pickup_reservations set status='rejected' where id=v_res.id and status='accepted';
 update public.store_inventory si
 set stock=si.stock+ri.quantity, updated_at=now()
 from public.pickup_reservation_items ri
 where ri.reservation_id=v_res.id and si.store_id=v_res.store_id and si.product_id=ri.product_id;
 insert into public.pickup_cancellation_reasons(reservation_id,reason,cancelled_by)
 values(v_res.id,btrim(p_reason),auth.uid());
 return 'cancelled';
end $fn$;
revoke all on function public.cancel_accepted_pickup(uuid,text) from public;
grant execute on function public.cancel_accepted_pickup(uuid,text) to authenticated;
-- Customer-readable cancellation reason, scoped to the customer's own order.
create or replace function public.my_pickup_cancellation_reasons()
returns table(reservation_id uuid,reason text)
language sql stable security definer set search_path='' as $fn$
 select c.reservation_id,c.reason from public.pickup_cancellation_reasons c
 join public.pickup_reservations r on r.id=c.reservation_id
 where r.customer_id=auth.uid()
$fn$;
revoke all on function public.my_pickup_cancellation_reasons() from public;
grant execute on function public.my_pickup_cancellation_reasons() to authenticated;
