create or replace function public.cancel_my_pickup(p_reservation_id uuid,p_reason text)
returns text language plpgsql security definer set search_path='' as $fn$
declare v_res public.pickup_reservations%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 5 and 300 then raise exception 'Reason must be 5 to 300 characters'; end if;
 select * into v_res from public.pickup_reservations r where r.id=p_reservation_id for update;
 if not found or v_res.customer_id is distinct from auth.uid() then raise exception 'Order not found'; end if;
 if v_res.status not in ('requested','accepted') then raise exception 'Order is no longer cancellable'; end if;
 if v_res.status='accepted' and (v_res.expires_at is null or v_res.expires_at<=now()) then raise exception 'Pickup expired'; end if;
 update public.pickup_reservations set status='rejected' where id=v_res.id;
 if v_res.status='accepted' then
  update public.store_inventory si set stock=si.stock+ri.quantity,updated_at=now()
  from public.pickup_reservation_items ri
  where ri.reservation_id=v_res.id and si.store_id=v_res.store_id and si.product_id=ri.product_id;
 end if;
 insert into public.pickup_cancellation_reasons(reservation_id,reason,cancelled_by)
 values(v_res.id,btrim(p_reason),auth.uid());
 return 'cancelled';
end $fn$;
revoke all on function public.cancel_my_pickup(uuid,text) from public;
grant execute on function public.cancel_my_pickup(uuid,text) to authenticated;
