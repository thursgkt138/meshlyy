-- Meshlyy POS v2: auditable stock adjustments.
create table if not exists public.stock_adjustments(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retailer_stores(id),
 product_id text not null,
 actor_id uuid not null references auth.users(id),
 previous_stock integer not null,
 new_stock integer not null check(new_stock>=0),
 delta integer not null,
 reason text not null check(reason in ('restock','damage','count_correction','return_to_stock','other')),
 note text,
 created_at timestamptz not null default now()
);
create index if not exists stock_adjustments_store_date_idx on public.stock_adjustments(store_id,created_at desc);
alter table public.stock_adjustments enable row level security;
drop policy if exists "Owner views stock adjustments" on public.stock_adjustments;
create policy "Owner views stock adjustments" on public.stock_adjustments for select to authenticated
using(exists(select 1 from public.retailer_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
revoke insert,update,delete on public.stock_adjustments from anon,authenticated;
create or replace function public.adjust_store_stock(p_store_id uuid,p_product_id text,p_delta integer,p_reason text,p_note text default null)
returns integer language plpgsql security definer set search_path='' as $$
declare v_old integer;v_new integer;
begin
 if auth.uid() is null or not exists(select 1 from public.retailer_stores where id=p_store_id and owner_id=auth.uid()) then raise exception 'Not authorized';end if;
 if p_delta is null or p_delta=0 or abs(p_delta)>100000 then raise exception 'Invalid stock change';end if;
 if p_reason not in ('restock','damage','count_correction','return_to_stock','other') then raise exception 'Invalid reason';end if;
 if length(coalesce(p_note,''))>500 then raise exception 'Note is too long';end if;
 select stock into v_old from public.store_inventory where store_id=p_store_id and product_id=p_product_id for update;
 if not found then raise exception 'Product not found in store';end if;
 v_new:=v_old+p_delta;
 if v_new<0 then raise exception 'Insufficient stock (available %)',v_old;end if;
 update public.store_inventory set stock=v_new,updated_at=now() where store_id=p_store_id and product_id=p_product_id;
 insert into public.stock_adjustments(store_id,product_id,actor_id,previous_stock,new_stock,delta,reason,note)
 values(p_store_id,p_product_id,auth.uid(),v_old,v_new,p_delta,p_reason,nullif(trim(p_note),''));
 return v_new;
end $$;
revoke all on function public.adjust_store_stock(uuid,text,integer,text,text) from public,anon;
grant execute on function public.adjust_store_stock(uuid,text,integer,text,text) to authenticated;
