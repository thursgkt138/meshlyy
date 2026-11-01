-- Meshlyy consumer search intelligence foundation.
-- Run in Supabase SQL Editor after reviewing. No consumer tracking starts until the app integrates this RPC.
create table if not exists public.consumer_search_events (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(query) between 2 and 120),
  result_count integer not null check (result_count between 0 and 100000),
  event_at timestamptz not null default now()
);
create index if not exists consumer_search_events_consumer_idx on public.consumer_search_events(consumer_id,event_at desc);
create index if not exists consumer_search_events_time_idx on public.consumer_search_events(event_at desc);
alter table public.consumer_search_events enable row level security;
revoke all on public.consumer_search_events from anon, authenticated;
-- Record only signed-in users' explicit searches; never expose individual search histories to retailers.
create or replace function public.record_consumer_search(p_query text,p_result_count integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_query text := left(trim(regexp_replace(coalesce(p_query,''),'[[:space:]]+',' ','g')),120);
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if char_length(v_query)<2 or p_result_count is null or p_result_count<0 or p_result_count>100000 then
    raise exception 'Invalid search event';
  end if;
  insert into public.consumer_search_events(consumer_id,query,result_count)
  values (auth.uid(),lower(v_query),p_result_count);
end; $$;
revoke all on function public.record_consumer_search(text,integer) from public,anon;
grant execute on function public.record_consumer_search(text,integer) to authenticated;
-- Privacy-preserving aggregate: do not return searches with fewer than 5 distinct consumers.
create or replace function public.get_store_search_demand(p_store_id uuid,p_days integer default 30)
returns table(search_term text, searches bigint, unique_consumers bigint, zero_result_searches bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.retailer_stores s where s.id=p_store_id and s.owner_id=auth.uid()
  ) then raise exception 'Not authorized'; end if;
  if p_days<1 or p_days>90 then raise exception 'Invalid range'; end if;
  return query
  select e.query, count(*)::bigint, count(distinct e.consumer_id)::bigint,
    count(*) filter (where e.result_count=0)::bigint
  from public.consumer_search_events e
  where e.event_at>=now()-(p_days || ' days')::interval
  group by e.query
  having count(distinct e.consumer_id)>=5
  order by count(*) desc
  limit 30;
end; $$;
revoke all on function public.get_store_search_demand(uuid,integer) from public,anon;
grant execute on function public.get_store_search_demand(uuid,integer) to authenticated;
-- Note: aggregate reflects platform-wide demand, not nearby demand. Add coarse geography
-- and consent-aware locality matching before presenting these results as local searches.
