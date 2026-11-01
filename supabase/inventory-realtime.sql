-- Enable Postgres change events for inventory synchronization.
-- Run in Supabase SQL Editor. RLS still controls which rows subscribers can see.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_inventory'
  ) then
    alter publication supabase_realtime add table public.store_inventory;
  end if;
end $$;
-- Use the database as the source of truth. Realtime is an invalidation signal,
-- not a substitute for checking available stock inside a locked transaction.
