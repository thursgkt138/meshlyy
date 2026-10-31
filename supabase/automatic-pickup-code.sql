-- Run AFTER secure-pickup-v2.sql. Automatically create a private code on acceptance.
-- Only the owning customer can retrieve it; the retailer can only verify it.
alter table private.pickup_secrets add column if not exists pickup_code text;
create or replace function private.issue_pickup_code_on_accept()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
 if new.status = 'accepted' and old.status is distinct from 'accepted' then
   v_code := lpad(((get_byte(public.gen_random_bytes(4),0)::bigint * 16777216
       + get_byte(public.gen_random_bytes(4),1)::bigint * 65536
       + get_byte(public.gen_random_bytes(4),2)::bigint * 256
       + get_byte(public.gen_random_bytes(4),3)::bigint) % 1000000)::text,6,'0');
   insert into private.pickup_secrets(reservation_id,code_hash,pickup_code,attempts)
   values(new.id,public.crypt(v_code,public.gen_salt('bf')),v_code,0)
   on conflict(reservation_id) do update
     set code_hash=excluded.code_hash,pickup_code=excluded.pickup_code,attempts=0,created_at=now();
 end if;
 return new;
end $$;
drop trigger if exists issue_pickup_code_on_accept on public.pickup_reservations;
create trigger issue_pickup_code_on_accept after update of status on public.pickup_reservations
for each row execute function private.issue_pickup_code_on_accept();

-- Backfill accepted, still-active reservations that predate this migration.
do $$
declare v record; v_code text;
begin
 for v in select r.id from public.pickup_reservations r
 where r.status='accepted' and r.expires_at>now()
 and not exists(select 1 from private.pickup_secrets s where s.reservation_id=r.id and s.pickup_code is not null)
 loop
   v_code := lpad((floor(random()*1000000)::integer)::text,6,'0');
   insert into private.pickup_secrets(reservation_id,code_hash,pickup_code,attempts)
   values(v.id,public.crypt(v_code,public.gen_salt('bf')),v_code,0)
   on conflict(reservation_id) do update set code_hash=excluded.code_hash,pickup_code=excluded.pickup_code,attempts=0,created_at=now();
 end loop;
end $$;

-- Stable retrieval; does not regenerate or invalidate the code on refresh.
create or replace function public.customer_pickup_code(p_reservation_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
 if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
 select s.pickup_code into v_code
 from private.pickup_secrets s
 join public.pickup_reservations r on r.id=s.reservation_id
 where r.id=p_reservation_id and r.customer_id=(select auth.uid())
   and r.status='accepted' and r.expires_at>now() and s.attempts<5;
 if v_code is null then raise exception 'Pickup code unavailable. Check reservation status or ask the shop for help'; end if;
 return v_code;
end $$;
revoke all on function public.customer_pickup_code(uuid) from public,anon;
grant execute on function public.customer_pickup_code(uuid) to authenticated;
-- Existing complete_pickup still checks code_hash, attempts, and expiry.
