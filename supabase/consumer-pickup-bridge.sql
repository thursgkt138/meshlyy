-- Meshlyy consumer pickup bridge v1. Run AFTER pickup-reservations.sql.
-- Exposes only active in-stock inventory and non-sensitive shop metadata.
-- All product prices are read from the database, never trusted from the client.
create or replace function public.discover_pickup_products(p_query text default '',p_locality text default '',p_limit integer default 100)
returns table(store_id uuid,store_name text,locality text,product_id text,price numeric,stock integer)
language sql stable security definer set search_path = '' as $$
 select s.id,s.name,s.locality,i.product_id,i.price,i.stock
 from public.store_inventory i
 join public.retailer_stores s on s.id=i.store_id
 where i.active and i.stock>0
 and (coalesce(trim(p_locality),'')='' or s.locality ilike '%'||replace(replace(trim(p_locality),'%','\\%'),'_','\\_')||'%')
 and (coalesce(trim(p_query),'')='' or i.product_id ilike '%'||replace(replace(trim(p_query),'%','\\%'),'_','\\_')||'%')
 order by s.name,i.product_id limit least(greatest(coalesce(p_limit,100),1),100)
$$;
revoke all on function public.discover_pickup_products(text,text,integer) from public;
grant execute on function public.discover_pickup_products(text,text,integer) to anon,authenticated;

drop policy if exists "Customer reads own reservations" on public.pickup_reservations;
create policy "Customer reads own reservations" on public.pickup_reservations for select to authenticated
using(customer_id=(select auth.uid()));
drop policy if exists "Customer reads own reservation items" on public.pickup_reservation_items;
create policy "Customer reads own reservation items" on public.pickup_reservation_items for select to authenticated
using(exists(select 1 from public.pickup_reservations r where r.id=reservation_id and r.customer_id=(select auth.uid())));

create or replace function public.request_pickup(p_store_id uuid,p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_customer uuid := auth.uid();
declare v_id uuid;
declare v_line record;
declare v_product text;
declare v_qty integer;
declare v_price numeric;
declare v_count integer := 0;
begin
 if v_customer is null then raise exception 'Sign in to reserve'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 30 then
   raise exception 'Choose between 1 and 30 products';
 end if;
 if not exists(select 1 from public.retailer_stores where id=p_store_id) then raise exception 'Shop unavailable'; end if;
 -- Reject duplicate product lines to prevent inconsistent totals.
 if (select count(*) from jsonb_array_elements(p_items) x) <>
    (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x) then
   raise exception 'Duplicate product lines';
 end if;
 insert into public.pickup_reservations(store_id,customer_id,status,pickup_minutes)
 values(p_store_id,v_customer,'requested',20) returning id into v_id;
 for v_line in select value from jsonb_array_elements(p_items) loop
   v_product:=v_line.value->>'product_id';
   if v_product is null or length(v_product)>250 then raise exception 'Invalid product'; end if;
   if (v_line.value->>'quantity') !~ '^[0-9]{1,3}$' then raise exception 'Invalid quantity'; end if;
   v_qty:=(v_line.value->>'quantity')::integer;
   if v_qty not between 1 and 20 then raise exception 'Quantity must be between 1 and 20'; end if;
   select i.price into v_price from public.store_inventory i
   where i.store_id=p_store_id and i.product_id=v_product and i.active and i.stock>=v_qty;
   if not found then raise exception 'Product unavailable or insufficient stock'; end if;
   insert into public.pickup_reservation_items(reservation_id,product_id,quantity,price_at_request)
   values(v_id,v_product,v_qty,v_price);
   v_count:=v_count+1;
 end loop;
 if v_count=0 then raise exception 'Empty reservation'; end if;
 return v_id;
end $$;
revoke all on function public.request_pickup(uuid,jsonb) from public,anon;
grant execute on function public.request_pickup(uuid,jsonb) to authenticated;

-- Critical: direct retailer stock editing must not undercut accepted reservations.
-- This is a test bridge; before public launch add server-side scheduled expiry,
-- OTP verification, customer cancellation and more granular inventory accounting.
