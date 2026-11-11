-- The new special-order payment prompt is queued only after the order transaction succeeds.
-- Ordinary checkout notification timing is unchanged.
create or replace function private.store_queue_special_order(p_id bigint) returns void language sql security invoker set search_path='' as $$
 insert into private.store_outbox(event_key,user_id,order_id,kind,payload)
 select 'special-order-status:'||o.id||':'||o.status,o.user_id,o.id,'custom',
 jsonb_build_object('special_order',jsonb_build_object('id',o.id,'status',o.status,'delivery_method',o.delivery_method,
 'amount',case when o.order_currency='USD' then o.total_price_usd else o.total_price_uzs end,'currency',coalesce(o.order_currency,'UZS'),'courier_link',o.courier_link))
 from public.orders o where o.id=p_id and o.special_fulfillment and o.checkout_abandoned_at is null
 and (o.status='Ожидает оплаты' or o.receipt_submitted_at is not null or o.paid_at is not null)
 on conflict(event_key) do nothing;
$$;

CREATE OR REPLACE FUNCTION public.store_cancel_order(p_user text, p_order_id bigint, p_delete boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; item jsonb; draft boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into o from public.orders where id=p_order_id and user_id=p_user for update;
  if not found then return false; end if;
  if o.checkout_abandoned_at is not null then return true; end if;
  draft:=o.payment_method='online_card' and o.status='Ожидает оплаты' and o.payment_status='pending'
    and o.paid_at is null and o.receipt_submitted_at is null and o.payment_screenshot_url is null;
  if p_delete and not draft then return false; end if;
  if o.status='Отменён' then return true; end if;
  if coalesce(o.payment_status,'pending')<>'pending' or o.paid_at is not null or o.status not in ('Ожидает оплаты','Активный') then return false; end if;
  if not o.stock_released then
    for item in select value from jsonb_array_elements(o.items) order by value->>'productId',value->>'size',value->>'colorId' loop
      if not coalesce((item->>'isSpecialOrder')::boolean,false) then
        update public.product_variants set stock=stock+(item->>'quantity')::integer
        where product_id::text=item->>'productId' and size_value=item->>'size'
          and color_id::text is not distinct from nullif(item->>'colorId','');
      end if;
    end loop;
  end if;
  update public.china_requests set reserved_order_id=null where reserved_order_id=o.id;
  update public.orders set status='Отменён',payment_status='cancelled',stock_released=true,
    checkout_abandoned_at=case when draft then clock_timestamp() else null end where id=o.id;
  update private.store_outbox set sent_at=clock_timestamp() where user_id=p_user and order_id=o.id
    and (kind in ('order','order_client') or (kind='custom' and payload->'special_order' is not null)) and sent_at is null;
  if o.special_fulfillment and not draft then perform private.store_queue_special_order(o.id); end if;
  return true;
end $function$;

create or replace function public.store_claim_custom_notification(p_id bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare event private.store_outbox%rowtype;
begin
 update private.store_outbox e set claimed_at=now(),attempts=e.attempts+1 where e.id=p_id and e.kind='custom' and e.sent_at is null
 and (e.claimed_at is null or e.claimed_at<now()-make_interval(secs=>least(3600,greatest(60,e.attempts*60))))
 and (e.payload->'special_order' is null or exists(select 1 from public.orders o where o.id=e.order_id and o.user_id=e.user_id and o.checkout_abandoned_at is null))
 and (e.payload->'special_order' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_order,id}'=e.payload#>>'{special_order,id}'))
 returning e.* into event;
 if not found then return null; end if;
 return to_jsonb(event);
end $$;

CREATE OR REPLACE FUNCTION public.store_admin_cancel_order(p_order_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; item jsonb;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into o from public.orders where id=p_order_id;
  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_order_id for update;
  if o.status='Отменён' then return to_jsonb(o); end if;
  if o.special_fulfillment and o.status in ('Получен','Доставлен') then raise exception 'Полученный заказ требует ручного рассмотрения возврата'; end if;
  if not o.stock_released then
    for item in select value from jsonb_array_elements(o.items) order by value->>'productId',value->>'size',value->>'colorId' loop
      if not coalesce((item->>'isSpecialOrder')::boolean,false) then
        update public.product_variants set stock=stock+(item->>'quantity')::integer
        where product_id::text=item->>'productId' and size_value=item->>'size'
          and color_id::text is not distinct from nullif(item->>'colorId','');
      end if;
    end loop;
  end if;
  update public.china_requests set reserved_order_id=null where reserved_order_id=o.id;
  if o.special_fulfillment then
    update private.store_outbox set sent_at=clock_timestamp() where order_id=o.id and user_id=o.user_id
    and payload#>>'{special_order,status}'='Ожидает оплаты' and sent_at is null;
  end if;
  update public.orders set status='Отменён',stock_released=true,
    payment_status=case when o.payment_status='paid' then 'refund_pending' else 'cancelled' end
    where id=p_order_id returning * into o;
  if o.special_fulfillment then
    perform private.store_queue_special_order(o.id);
    begin perform private.store_wake_worker(); exception when others then null; end;
  end if;
  return to_jsonb(o);
end $function$;

