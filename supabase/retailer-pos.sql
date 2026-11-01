-- Meshlyy in-store POS. Run once in Supabase SQL Editor.
create table if not exists public.pos_sales (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retailer_stores(id),
 cashier_id uuid not null references auth.users(id),
 payment_method text not null check (payment_method in ('cash','upi','card','other')),
 total numeric(12,2) not null check (total>=0),
 created_at timestamptz not null default now()
);
create table if not exists public.pos_sale_items (
 sale_id uuid not null references public.pos_sales(id) on delete cascade,
 product_id text not null,
 quantity integer not null check (quantity>0),
 unit_price numeric(12,2) not null check (unit_price>0),
 primary key(sale_id,product_id)
);
create index if not exists pos_sales_store_date_idx on public.pos_sales(store_id,created_at desc);
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;
drop policy if exists "Store owners read POS sales" on public.pos_sales;
create policy "Store owners read POS sales" on public.pos_sales for select to authenticated
 using (exists(select 1 from public.retailer_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
drop policy if exists "Store owners read POS items" on public.pos_sale_items;
create policy "Store owners read POS items" on public.pos_sale_items for select to authenticated
 using (exists(select 1 from public.pos_sales p join public.retailer_stores s on s.id=p.store_id where p.id=sale_id and s.owner_id=(select auth.uid())));
revoke insert,update,delete on public.pos_sales,public.pos_sale_items from anon,authenticated;
create or replace function public.record_pos_sale(p_store_id uuid,p_items jsonb,p_payment_method text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_sale uuid; v_line jsonb; v_id text; v_qty integer; v_price numeric(12,2); v_stock integer; v_active boolean; v_total numeric(12,2):=0; v_count integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.retailer_stores where id=p_store_id and owner_id=auth.uid()) then raise exception 'Not authorized for this store'; end if;
 if p_payment_method not in ('cash','upi','card','other') then raise exception 'Invalid payment method'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Provide 1–100 line items'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) j group by j->>'product_id' having count(*)>1) then raise exception 'Duplicate products in basket'; end if;
 -- Lock inventory in deterministic product order to prevent overselling and deadlocks.
 for v_line in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
   v_id:=v_line->>'product_id';
   if v_id is null or length(v_id)=0 or v_line->>'quantity' !~ '^[0-9]+$' then raise exception 'Invalid product or quantity'; end if;
   v_qty:=(v_line->>'quantity')::integer;
   if v_qty<1 or v_qty>10000 then raise exception 'Quantity out of range'; end if;
   select price,stock,active into v_price,v_stock,v_active from public.store_inventory
     where store_id=p_store_id and product_id=v_id for update;
   if not found or not v_active then raise exception 'Product unavailable: %',v_id; end if;
   if v_stock<v_qty then raise exception 'Insufficient stock for % (available %)',v_id,v_stock; end if;
   v_total:=v_total+v_price*v_qty;
   v_count:=v_count+1;
 end loop;
 insert into public.pos_sales(store_id,cashier_id,payment_method,total)
 values(p_store_id,auth.uid(),p_payment_method,v_total) returning id into v_sale;
 for v_line in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
   v_id:=v_line->>'product_id'; v_qty:=(v_line->>'quantity')::integer;
   select price into v_price from public.store_inventory where store_id=p_store_id and product_id=v_id;
   insert into public.pos_sale_items(sale_id,product_id,quantity,unit_price) values(v_sale,v_id,v_qty,v_price);
   update public.store_inventory set stock=stock-v_qty,updated_at=now() where store_id=p_store_id and product_id=v_id;
 end loop;
 return v_sale;
end $$;
revoke all on function public.record_pos_sale(uuid,jsonb,text) from public,anon;
grant execute on function public.record_pos_sale(uuid,jsonb,text) to authenticated;
