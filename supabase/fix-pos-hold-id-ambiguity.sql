-- Fix PL/pgSQL ambiguous hold_id reference in POS quantity RPC.
-- Apply in Supabase SQL Editor after the original pos-bill-holds.sql migration.
-- Replaces only set_pos_bill_quantity; keeps atomic stock locking intact.
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
  on conflict on constraint pos_bill_hold_items_pkey do update set quantity=excluded.quantity;
 end if;
 if not exists(select 1 from public.pos_bill_hold_items where pos_bill_hold_items.hold_id=h.id) then
  update public.pos_bill_holds set status='released' where id=h.id;
 else
  return query select h.id,h.expires_at,p_quantity;
 end if;
end $fn$;
