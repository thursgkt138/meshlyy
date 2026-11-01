-- Meshlyy retailer onboarding and manual store availability.
alter table public.retailer_stores add column if not exists pincode text;
alter table public.retailer_stores add column if not exists opens_at time;
alter table public.retailer_stores add column if not exists closes_at time;
alter table public.retailer_stores add column if not exists is_open boolean not null default false;
alter table public.retailer_stores add column if not exists business_name text;
alter table public.retailer_stores add column if not exists logo_url text;
alter table public.retailer_stores add column if not exists photo_urls text[] not null default '{}';
alter table public.retailer_stores add column if not exists gstin text;
-- Bank account details deliberately not stored in retailer_stores: use a vetted
-- payment provider's onboarding/tokenisation before collecting financial details.
alter table public.retailer_stores drop constraint if exists retailer_stores_pincode_check;
alter table public.retailer_stores add constraint retailer_stores_pincode_check check (pincode is null or pincode ~ '^[0-9]{6}$');
create or replace function public.set_retailer_store_open(p_store_id uuid,p_is_open boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 update public.retailer_stores set is_open=p_is_open where id=p_store_id and owner_id=auth.uid();
 if not found then raise exception 'Store not found or access denied'; end if;
 return p_is_open;
end $$;
revoke all on function public.set_retailer_store_open(uuid,boolean) from public,anon;
grant execute on function public.set_retailer_store_open(uuid,boolean) to authenticated;
