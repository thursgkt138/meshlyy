-- Meshlyy POS bill holds: apply AFTER retailer-pos.sql. Do not deploy without testing.
begin;
create table if not exists public.pos_bill_holds(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retailer_stores(id),
 cashier_id uuid not null references auth.users(id),
 status text not null default 'active' check(status in ('active','expired','released','converted')),
 expires_at timestamptz not null default(now()+interval '60 seconds'),
 created_at timestamptz not null default now(),
 sale_id uuid references public.pos_sales(id)
);
create unique index if not exists pos_bill_one_active on public.pos_bill_holds(store_id,cashier_id) where status='active';
create index if not exists pos_bill_expiry_idx on public.pos_bill_holds(expires_at) where status='active';
create table if not exists public.pos_bill_hold_items(
 hold_id uuid not null references public.pos_bill_holds(id) on delete cascade,
 product_id text not null,
 quantity integer not null check(quantity between 1 and 100),
 unit_price numeric(12,2) not null check(unit_price>0),
 primary key(hold_id,product_id)
);
alter table public.pos_bill_holds enable row level security;
alter table public.pos_bill_hold_items enable row level security;
revoke all on public.pos_bill_holds,public.pos_bill_hold_items from anon,authenticated;
create or replace function public._release_pos_bill_hold(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $fn$
declare h public.pos_bill_holds%rowtype; line record;
begin
 select * into h from public.pos_bill_holds where id=p_id for update;
 if not found or h.status<>'active' then return; end if;
 if p_status not in ('expired','released') then raise exception 'Invalid release status'; end if;
 for line in select * from public.pos_bill_hold_items where hold_id=h.id order by product_id loop
  update public.store_inventory set stock=stock+line.quantity,updated_at=now()
   where store_id=h.store_id and product_id=line.product_id;
  if not found then raise exception 'Missing inventory row for %',line.product_id; end if;
 end loop;
 update public.pos_bill_holds set status=p_status where id=h.id;
end $fn$;
create or replace function public.set_pos_bill_quantity(p_store_id uuid,p_product_id text,p_quantity integer)
returns table(hold_id uuid,expires_at timestamptz,quantity integer)
language plpgsql security definer set search_path='' as $fn$
declare h public.pos_bill_holds%rowtype; old_qty integer:=0; delta integer; v_price numeric; v_changed integer;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.retailer_stores where id=p_store_id and owner_id=auth.uid()) then raise exception 'Not authorized'; end if;
 if p_quantity<0 or p_quantity>100 or p_quantity is null or nullif(p_product_id,'') is null then raise exception 'Invalid quantity/product'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_store_id::text||':'||auth.uid()::text,0));
 select * into h from public.pos_bill_holds where store_id=p_store_id and cashier_id=auth.uid() and status='active' for update;
 if found and h.expires_at<=clock_timestamp() then
  perform public._release_pos_bill_hold(h.id,'expired');
  h.id:=null;
 end if;
 if h.id is null then
  if p_quantity=0 then return; end if;
  insert into public.pos_bill_holds(store_id,cashier_id) values(p_store_id,auth.uid()) returning * into h;
 end if;
 select i.quantity into old_qty from public.pos_bill_hold_items i where i.hold_id=h.id and i.product_id=p_product_id;
 old_qty:=coalesce(old_qty,0);
 delta:=p_quantity-old_qty;
 if delta>0 then
  update public.store_inventory set stock=stock-delta,updated_at=now()
  where store_id=p_store_id and product_id=p_product_id and active=true and stock>=delta
  returning price into v_price;
  get diagnostics v_changed=row_count;
  if v_changed<>1 then raise exception 'Insufficient available stock'; end if;
 elsif delta<0 then
  update public.store_inventory set stock=stock-delta,updated_at=now()
  where store_id=p_store_id and product_id=p_product_id returning price into v_price;
  if not found then raise exception 'Inventory row missing'; end if;
 end if;
 if p_quantity=0 then
  delete from public.pos_bill_hold_items where hold_id=h.id and product_id=p_product_id;
 else
  if v_price is null then
   select price into v_price from public.store_inventory where store_id=p_store_id and product_id=p_product_id;
  end if;
  insert into public.pos_bill_hold_items(hold_id,product_id,quantity,unit_price)
  values(h.id,p_product_id,p_quantity,v_price)
  on conflict(hold_id,product_id) do update set quantity=excluded.quantity;
 end if;
 if not exists(select 1 from public.pos_bill_hold_items where pos_bill_hold_items.hold_id=h.id) then
  update public.pos_bill_holds set status='released' where id=h.id;
 else
  return query select h.id,h.expires_at,p_quantity;
 end if;
end $fn$;
create or replace function public.my_pos_bill_hold(p_store_id uuid)
returns table(hold_id uuid,product_id text,quantity integer,unit_price numeric,expires_at timestamptz)
language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not exists(select 1 from public.retailer_stores where id=p_store_id and owner_id=auth.uid()) then raise exception 'Not authorized'; end if;
 return query select h.id,i.product_id,i.quantity,i.unit_price,h.expires_at
 from public.pos_bill_holds h join public.pos_bill_hold_items i on i.hold_id=h.id
 where h.store_id=p_store_id and h.cashier_id=auth.uid() and h.status='active' and h.expires_at>now();
end $fn$;
create or replace function public.complete_pos_bill_hold(p_hold_id uuid,p_payment_method text)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare h public.pos_bill_holds%rowtype; v_sale uuid; v_total numeric; line record;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_payment_method not in ('upi','cash','card','other') then raise exception 'Invalid payment method'; end if;
 select * into h from public.pos_bill_holds where id=p_hold_id for update;
 if not found or h.cashier_id<>auth.uid() or not exists(select 1 from public.retailer_stores where id=h.store_id and owner_id=auth.uid()) then raise exception 'Not authorized'; end if;
 if h.status='converted' then return h.sale_id; end if;
 if h.status<>'active' or h.expires_at<=clock_timestamp() then raise exception 'Bill hold expired; rebuild bill'; end if;
 select sum(quantity*unit_price) into v_total from public.pos_bill_hold_items where hold_id=h.id;
 if v_total is null then raise exception 'Empty bill'; end if;
 insert into public.pos_sales(store_id,cashier_id,payment_method,total)
 values(h.store_id,auth.uid(),p_payment_method,v_total) returning id into v_sale;
 for line in select * from public.pos_bill_hold_items where hold_id=h.id order by product_id loop
  insert into public.pos_sale_items(sale_id,product_id,quantity,unit_price)
  values(v_sale,line.product_id,line.quantity,line.unit_price);
 end loop;
 update public.pos_bill_holds set status='converted',sale_id=v_sale where id=h.id;
 return v_sale;
end $fn$;
create or replace function public.release_pos_bill_hold(p_hold_id uuid)
returns text language plpgsql security definer set search_path='' as $fn$
declare h public.pos_bill_holds%rowtype;
begin
 select * into h from public.pos_bill_holds where id=p_hold_id for update;
 if not found or h.cashier_id<>auth.uid() or not exists(select 1 from public.retailer_stores where id=h.store_id and owner_id=auth.uid()) then raise exception 'Not authorized'; end if;
 perform public._release_pos_bill_hold(h.id,'released');
 return 'released';
end $fn$;
create or replace function public.expire_pos_bill_holds()
returns integer language plpgsql security definer set search_path='' as $fn$
declare h record; n integer:=0;
begin
 for h in select id from public.pos_bill_holds where status='active' and expires_at<=now() order by expires_at,id for update skip locked loop
  perform public._release_pos_bill_hold(h.id,'expired'); n:=n+1;
 end loop;
 return n;
end $fn$;
revoke all on function public._release_pos_bill_hold(uuid,text),public.expire_pos_bill_holds() from public,anon,authenticated;
revoke all on function public.set_pos_bill_quantity(uuid,text,integer),public.my_pos_bill_hold(uuid),public.complete_pos_bill_hold(uuid,text),public.release_pos_bill_hold(uuid) from public,anon;
grant execute on function public.set_pos_bill_quantity(uuid,text,integer),public.my_pos_bill_hold(uuid),public.complete_pos_bill_hold(uuid,text),public.release_pos_bill_hold(uuid) to authenticated;
commit;
-- After review, schedule separately: select cron.schedule('meshlyy-expire-pos-bills','* * * * *','select public.expire_pos_bill_holds()');
