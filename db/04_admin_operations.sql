-- Authenticated manager RPCs. Explicit allowlist checked inside each privileged function.
create or replace function public.store_admin_cancel_order(p_order_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; item jsonb;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into o from public.orders where id=p_order_id;
  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_order_id for update;
  if o.status='Отменён' then return to_jsonb(o); end if;
  if not o.stock_released then
    for item in select value from jsonb_array_elements(o.items) order by value->>'productId',value->>'size',value->>'colorId' loop
      if not coalesce((item->>'isSpecialOrder')::boolean,false) then
        update public.product_variants set stock=stock+(item->>'quantity')::integer
        where product_id::text=item->>'productId' and size_value=item->>'size'
          and color_id::text is not distinct from nullif(item->>'colorId','');
      end if;
    end loop;
  end if;
  if o.special_order_id is not null then
    update public.china_requests set status='Оценён',converted_to_order_id=null
      where id::text=o.special_order_id and converted_to_order_id=o.id::text;
  end if;
  update public.orders set status='Отменён',stock_released=true,
    payment_status=case when o.payment_status='paid' then 'refund_pending' else 'cancelled' end
    where id=p_order_id returning * into o;
  return to_jsonb(o);
end $$;
revoke all on function public.store_admin_cancel_order(bigint) from public,anon;
grant execute on function public.store_admin_cancel_order(bigint) to authenticated;

create or replace function public.store_admin_confirm_payment(p_order_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into o from public.orders where id=p_order_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_order_id for update;
  if o.payment_status='paid' and o.status<>'Отменён' then return true; end if;
  if o.status='Отменён' or o.stock_released or o.payment_status is distinct from 'pending' then return false; end if;
  update public.orders set status='Активный',payment_status='paid',paid_at=now(),payment_provider='manual' where id=p_order_id;
  if o.special_order_id is not null then
    update public.china_requests set status='Оплачен' where id::text=o.special_order_id and converted_to_order_id=o.id::text;
  end if;
  return true;
end $$;
revoke all on function public.store_admin_confirm_payment(bigint) from public,anon;
grant execute on function public.store_admin_confirm_payment(bigint) to authenticated;
