-- Meshlyy Consumer Intelligence v2: event tracking (signed-in only).
-- Apply after consumer-search-intelligence.sql. No raw event access for retailers.
create table if not exists public.consumer_product_events (
 id uuid primary key default gen_random_uuid(),
 consumer_id uuid not null references auth.users(id) on delete cascade,
 product_id text not null check (length(product_id) between 1 and 200),
 store_id uuid not null references public.retailer_stores(id) on delete cascade,
 event_type text not null check (event_type in ('view','basket_add','pickup_requested')),
 locality text check (length(locality)<=80),
 event_at timestamptz not null default now()
);
create index if not exists consumer_product_events_store_time_idx on public.consumer_product_events(store_id,event_at desc);
create index if not exists consumer_product_events_consumer_time_idx on public.consumer_product_events(consumer_id,event_at desc);
alter table public.consumer_product_events enable row level security;
revoke all on public.consumer_product_events from anon,authenticated;
create or replace function public.record_consumer_product_event(p_store_id uuid,p_product_id text,p_event_type text,p_locality text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_locality text := nullif(left(lower(trim(coalesce(p_locality,''))),80),'');
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_event_type not in ('view','basket_add','pickup_requested') or length(coalesce(p_product_id,'')) not between 1 and 200 then
  raise exception 'Invalid event';
 end if;
 if not exists(select 1 from public.retailer_stores s join public.store_inventory i on i.store_id=s.id
               where s.id=p_store_id and i.product_id=p_product_id) then raise exception 'Unknown product listing'; end if;
 -- Rate-limit duplicate views, not basket additions or requests.
 if p_event_type='view' and exists(select 1 from public.consumer_product_events e where e.consumer_id=auth.uid()
  and e.store_id=p_store_id and e.product_id=p_product_id and e.event_type='view'
  and e.event_at>now()-interval '5 minutes') then return; end if;
 insert into public.consumer_product_events(consumer_id,store_id,product_id,event_type,locality)
 values(auth.uid(),p_store_id,p_product_id,p_event_type,v_locality);
end; $$;
revoke all on function public.record_consumer_product_event(uuid,text,text,text) from public,anon;
grant execute on function public.record_consumer_product_event(uuid,text,text,text) to authenticated;
-- Aggregate only products engaged by >=5 distinct consumers per store.
create or replace function public.get_store_product_engagement(p_store_id uuid,p_days integer default 30)
returns table(product_id text,unique_consumers bigint,product_views bigint,basket_adds bigint,pickup_requests bigint)
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.retailer_stores s where s.id=p_store_id and s.owner_id=auth.uid())
 then raise exception 'Not authorized'; end if;
 if p_days is null or p_days<1 or p_days>90 then raise exception 'Invalid range'; end if;
 return query
 select e.product_id,count(distinct e.consumer_id)::bigint,
 count(*) filter(where e.event_type='view')::bigint,
 count(*) filter(where e.event_type='basket_add')::bigint,
 count(*) filter(where e.event_type='pickup_requested')::bigint
 from public.consumer_product_events e
 where e.store_id=p_store_id and e.event_at>=now()-(p_days || ' days')::interval
 group by e.product_id having count(distinct e.consumer_id)>=5
 order by count(*) desc limit 30;
end; $$;
revoke all on function public.get_store_product_engagement(uuid,integer) from public,anon;
grant execute on function public.get_store_product_engagement(uuid,integer) to authenticated;
-- This records interaction events, not verified conversion rates. Completed pickups must be
-- derived separately from server-side reservation records to avoid false conversion claims.
