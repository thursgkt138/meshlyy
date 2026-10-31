-- Meshlyy secure pickup completion + automatic expiry, v2.
-- Run after pickup-reservations.sql and consumer-pickup-bridge.sql.
-- Never expose service-role credentials or OTP hashes to browsers.
create extension if not exists pgcrypto;

alter table public.pickup_reservations
 add column if not exists pickup_code_hash text,
 add column if not exists pickup_code_attempts integer not null default 0;

-- Keep the secret out of client-accessible SELECTs by moving it to a private table.
create schema if not exists private;
create table if not exists private.pickup_secrets (
 reservation_id uuid primary key references public.pickup_reservations(id) on delete cascade,
 code_hash text not null,
 attempts integer not null default 0,
 created_at timestamptz not null default now()
);
revoke all on schema private from public,anon,authenticated;
revoke all on all tables in schema private from public,anon,authenticated;

-- Use cryptographically generated codes; return plaintext ONLY to the authenticated customer.
-- Reissuing a code invalidates the previous one. Codes are available only for accepted,
-- unexpired orders and never stored in readable form.
create or replace function public.customer_pickup_code(p_reservation_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.pickup_reservations%rowtype;
declare code text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into v from public.pickup_reservations where id=p_reservation_id for update;
 if not found or v.customer_id<>auth.uid() then raise exception 'Reservation not found'; end if;
 if v.status<>'accepted' or v.expires_at<=now() then raise exception 'Pickup window is not active'; end if;
 -- Limit code rotation to avoid abuse.
 if exists(select 1 from private.pickup_secrets where reservation_id=v.id and attempts>=5)
 then raise exception 'Pickup code locked; contact the shop'; end if;
 code:=lpad((floor((get_byte(gen_random_bytes(4),0)::bigint*16777216
   +get_byte(gen_random_bytes(4),1)::bigint*65536
   +get_byte(gen_random_bytes(4),2)::bigint*256
   +get_byte(gen_random_bytes(4),3)::bigint)%1000000)::integer::text,6,'0');
 insert into private.pickup_secrets(reservation_id,code_hash,attempts)
 values(v.id,crypt(code,gen_salt('bf')),0)
 on conflict(reservation_id) do update set code_hash=excluded.code_hash,attempts=0,created_at=now();
 return code;
end $$;
revoke all on function public.customer_pickup_code(uuid) from public,anon;
grant execute on function public.customer_pickup_code(uuid) to authenticated;

-- Retailer completes only with the customer's active six-digit code.
create or replace function public.complete_pickup(p_reservation_id uuid,p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.pickup_reservations%rowtype;
declare secret private.pickup_secrets%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into v from public.pickup_reservations where id=p_reservation_id for update;
 if not found then raise exception 'Reservation not found'; end if;
 if not exists(select 1 from public.retailer_stores where id=v.store_id and owner_id=auth.uid())
 then raise exception 'Not authorized for this shop'; end if;
 if v.status<>'accepted' or v.expires_at<=now() then raise exception 'Pickup window has ended'; end if;
 select * into secret from private.pickup_secrets where reservation_id=v.id for update;
 if not found then raise exception 'Ask customer to generate their pickup code'; end if;
 if secret.attempts>=5 then raise exception 'Code locked'; end if;
 if p_code is null or p_code !~ '^[0-9]{6}$' or crypt(p_code,secret.code_hash)<>secret.code_hash then
   update private.pickup_secrets set attempts=attempts+1 where reservation_id=v.id;
   raise exception 'Incorrect pickup code';
 end if;
 update public.pickup_reservations set status='completed',completed_at=now(),updated_at=now()
 where id=v.id;
 delete from private.pickup_secrets where reservation_id=v.id;
 return 'completed';
end $$;
revoke all on function public.complete_pickup(uuid,text) from public,anon;
grant execute on function public.complete_pickup(uuid,text) to authenticated;

-- Idempotent server-side expiry; row lock ensures one-time stock restoration.
create or replace function public.expire_pickup_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare v record; line record; expired_count integer:=0;
begin
 -- Called by pg_cron as postgres, never directly by browsers.
 if current_user not in ('postgres','supabase_admin') then raise exception 'Not authorized'; end if;
 for v in select id,store_id from public.pickup_reservations
   where status='accepted' and expires_at<=now()
   order by expires_at for update skip locked loop
   for line in select product_id,quantity from public.pickup_reservation_items
     where reservation_id=v.id order by product_id loop
     update public.store_inventory set stock=stock+line.quantity,updated_at=now()
     where store_id=v.store_id and product_id=line.product_id;
   end loop;
   update public.pickup_reservations set status='expired',updated_at=now() where id=v.id;
   delete from private.pickup_secrets where reservation_id=v.id;
   expired_count:=expired_count+1;
 end loop;
 return expired_count;
end $$;
revoke all on function public.expire_pickup_reservations() from public,anon,authenticated;

-- Supabase Cron / pg_cron: enable pg_cron extension in Supabase Dashboard first,
-- then schedule this in SQL Editor (one minute cadence):
-- select cron.schedule('meshlyy-expire-pickups','* * * * *','select public.expire_pickup_reservations()');
-- Verify the job is running under postgres and monitor cron.job_run_details.
