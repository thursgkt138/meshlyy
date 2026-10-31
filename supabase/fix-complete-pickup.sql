-- Apply after secure-pickup-v2.sql and automatic-pickup-code.sql.
-- Correct pgcrypto schema for this Supabase project; preserve verification and stock semantics.
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
 if p_code is null or p_code !~ '^[0-9]{6}$' or extensions.crypt(p_code,secret.code_hash)<>secret.code_hash then
   update private.pickup_secrets set attempts=attempts+1 where reservation_id=v.id;
   return 'incorrect_code';
 end if;
 update public.pickup_reservations set status='completed',completed_at=now(),updated_at=now()
 where id=v.id;
 delete from private.pickup_secrets where reservation_id=v.id;
 return 'completed';
end $$;
revoke all on function public.complete_pickup(uuid,text) from public,anon;
grant execute on function public.complete_pickup(uuid,text) to authenticated;

