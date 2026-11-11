-- Only new checkouts use the international fulfillment chain. Historical rows are not rewritten.
alter table public.orders add column special_fulfillment boolean not null default false;
alter table public.orders add constraint store_special_checkout_shape check(not special_fulfillment or
 coalesce((jsonb_typeof(items)='array' and jsonb_array_length(items)=1 and items->0->>'isSpecialOrder'='true'
 and items->0->>'quantity'='1' and payment_method='online_card' and special_order_id is not null),false));
alter table public.orders add constraint store_special_fulfillment_status check(not special_fulfillment or (status is not null and status in
 ('Ожидает оплаты','Принят','Заказан у поставщика','В пути','Прибыл в страну','Собирается','Готов к выдаче','Получен','Упакован','Передан курьеру','Доставлен','Отменён')));

create function private.store_retire_legacy_notice(p_user text,p_notice jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_notice is null then return; end if;
 insert into private.store_outbox(event_key,user_id,kind,payload,sent_at)
 values('admin:'||auth.uid()||':'||(p_notice->>'key')::uuid,p_user,'custom','{}',clock_timestamp())
 on conflict(event_key) do update set sent_at=excluded.sent_at;
end $$;
revoke all on function private.store_retire_legacy_notice(text,jsonb) from public,anon,authenticated;

create function private.store_queue_special_order(p_id bigint) returns void language sql security invoker set search_path='' as $$
 insert into private.store_outbox(event_key,user_id,order_id,kind,payload)
 select 'special-order-status:'||o.id||':'||o.status,o.user_id,o.id,'custom',
 jsonb_build_object('special_order',jsonb_build_object('id',o.id,'status',o.status,'delivery_method',o.delivery_method,
 'amount',case when o.order_currency='USD' then o.total_price_usd else o.total_price_uzs end,'currency',coalesce(o.order_currency,'UZS'),'courier_link',o.courier_link))
 from public.orders o where o.id=p_id and o.special_fulfillment and o.checkout_abandoned_at is null
 and (o.receipt_submitted_at is not null or o.paid_at is not null)
 on conflict(event_key) do nothing;
$$;
revoke all on function private.store_queue_special_order(bigint) from public,anon,authenticated;
grant execute on function private.store_queue_special_order(bigint) to service_role;


CREATE OR REPLACE FUNCTION public.store_create_order(p_user text, p_payload jsonb, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  o public.orders%rowtype; r public.china_requests%rowtype; p public.products%rowtype;
  v public.product_variants%rowtype; item jsonb; items jsonb := '[]'; q integer;
  rate numeric; sale boolean; price numeric; subtotal numeric := 0; delivery numeric := 0; threshold numeric; delivery_settings jsonb;
  request_ids bigint[] := '{}'; request_id bigint;
  pending_count integer; pending_units integer; requested_units integer;
  special text; color_name text; delivery_method text := p_payload->>'delivery_method';
  payment_method text := p_payload->>'payment_method';
begin
  if p_user !~ '^[1-9][0-9]{0,15}$' or p_key is null then raise exception 'Invalid customer'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||p_user,0));
  select * into o from public.orders where user_id=p_user and request_key=p_key;
  if found then return to_jsonb(o); end if;
  select count(*),coalesce(sum((select coalesce(sum((i->>'quantity')::integer),0)
      from jsonb_array_elements(existing_order.items) i)),0)
    into pending_count,pending_units from public.orders existing_order
    where existing_order.user_id=p_user and existing_order.payment_status='pending' and existing_order.stock_released=false and existing_order.status<>'Отменён';
  if pending_count>=3 then raise exception 'Reservation limit'; end if;
  if length(p_payload->>'client_name') not between 3 and 120
     or coalesce(p_payload->>'client_phone','') !~ '^\+998[0-9]{9}$'
     or delivery_method not in ('pickup','delivery') or payment_method not in ('online_card','upon_receipt')
     or p_payload->>'order_currency' not in ('USD','UZS')
     or (delivery_method='delivery' and (length(coalesce(p_payload->>'delivery_address','')) not between 5 and 500 or payment_method<>'online_card'))
     then raise exception 'Invalid order'; end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 50 then raise exception 'Invalid items'; end if;
  if nullif(p_payload->>'special_order_id','') is not null or exists(select 1 from jsonb_array_elements(p_payload->'items') i where i->>'isSpecialOrder'='true' or nullif(i->>'specialRequestId','') is not null) then
    if jsonb_array_length(p_payload->'items')<>1 or p_payload#>>'{items,0,isSpecialOrder}' is distinct from 'true' or p_payload#>>'{items,0,quantity}' is distinct from '1' then raise exception 'Special checkout must contain one special item'; end if;
    if payment_method is distinct from 'online_card' then raise exception 'Special checkout requires full prepayment'; end if;
  end if;
  select sum((value->>'quantity')::integer) into requested_units from jsonb_array_elements(p_payload->'items');
  if requested_units is null or requested_units<1 or pending_units+requested_units>10 then raise exception 'Reservation limit'; end if;
  select (value->>'rate')::numeric into rate from public.settings where key='exchange_rate';
  if rate is null or rate<=0 then raise exception 'Exchange rate unavailable'; end if;
  select coalesce((value->>'enabled')::boolean,false) into sale from public.settings where key='sale_mode_enabled';
  special := nullif(p_payload->>'special_order_id','');
    -- Stable lock ordering prevents deadlocks between overlapping carts.
    for item in select value from jsonb_array_elements(p_payload->'items') order by value->>'productId',value->>'size',value->>'colorId' loop
      if jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Invalid quantity'; end if;
      q:=(item->>'quantity')::integer;
      if q>99 then raise exception 'Invalid quantity'; end if;
      if coalesce((item->>'isSpecialOrder')::boolean,false) then
        if q<>1 or coalesce(item->>'specialRequestId',special,'') !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid special order'; end if;
        request_id:=coalesce(item->>'specialRequestId',special)::bigint;
        if request_id=any(request_ids) then raise exception 'Duplicate special request'; end if;
        select * into r from public.china_requests where id=request_id and user_id=p_user for update;
        if not found or r.status<>'Оценён' or r.manager_price is null or r.manager_price<=0 or r.converted_to_order_id is not null or r.reserved_order_id is not null then raise exception 'Special order unavailable'; end if;
        request_ids:=array_append(request_ids,r.id); subtotal:=subtotal+r.manager_price;
        items:=items||jsonb_build_array(jsonb_build_object('productId','special-'||r.id,'name',coalesce(r.product_name,'Спецзаказ №'||r.id),
          'size',coalesce(r.size_color,'—'),'quantity',1,'priceUsd',r.manager_price,'priceUzs',round(r.manager_price*rate),'image',r.image_url,'isSpecialOrder',true,'specialRequestId',r.id));
      else
      select * into p from public.products where id::text=item->>'productId' and is_active=true for share;
      if not found then raise exception 'Product unavailable'; end if;
      if not exists(select 1 from public.categories where id=p.category and is_active)
        or (p.subcategory is not null and not exists(select 1 from public.subcategories where id=p.subcategory and is_active)) then raise exception 'Product unavailable'; end if;
      select * into strict v from public.product_variants where product_id=p.id and size_value=item->>'size'
        and color_id::text is not distinct from nullif(item->>'colorId','') for update;
      if v.stock<q then raise exception 'Not enough stock'; end if;
      update public.product_variants set stock=stock-q where id=v.id;
      price:=case when sale and p.sale_price>0 then p.sale_price else p.price_usd end;
      if price<0 then raise exception 'Invalid price'; end if;
      select name_ru into color_name from public.product_colors where id=v.color_id and product_id=p.id;
      subtotal:=subtotal+price*q;
      items:=items||jsonb_build_array(jsonb_build_object('productId',p.id,'variantId',v.id,'name',p.name_ru,'size',v.size_value,
        'colorId',v.color_id,'colorName',color_name,'quantity',q,'priceUsd',price,'priceUzs',round(price*rate),'image',p.images[1]));
      end if;
    end loop;
  special:=case when cardinality(request_ids)=1 then request_ids[1]::text else null end;
  if delivery_method='delivery' then
    select jsonb_object_agg(key,value) into delivery_settings from public.settings where key in ('delivery_price','free_delivery_threshold');
    delivery:=coalesce((delivery_settings#>>'{delivery_price,price_usd}')::numeric,(delivery_settings#>>'{delivery_price,price}')::numeric/rate,0);
    threshold:=coalesce((delivery_settings#>>'{free_delivery_threshold,amount_usd}')::numeric,(delivery_settings#>>'{free_delivery_threshold,amount}')::numeric/rate,0);
    if threshold>0 and subtotal>=threshold then delivery:=0; end if;
  end if;
  if delivery<0 then raise exception 'Invalid delivery'; end if;
  -- Do not silently charge a different total from the checkout the customer reviewed.
  if p_payload->>'order_currency'='UZS' then
    if jsonb_typeof(p_payload->'expected_total_uzs') is distinct from 'number'
      or (p_payload->>'expected_total_uzs')::numeric<>round((subtotal+delivery)*rate) then raise exception 'Price changed'; end if;
  else
    if jsonb_typeof(p_payload->'expected_total_usd') is distinct from 'number'
      or round((p_payload->>'expected_total_usd')::numeric,2)<>round(subtotal+delivery,2) then raise exception 'Price changed'; end if;
  end if;
  insert into public.orders(user_id,user_chat_id,client_name,client_phone,delivery_method,delivery_address,payment_method,
    total_price_usd,total_price_uzs,exchange_rate_at_order,order_currency,items,status,payment_status,special_order_id,request_key,reservation_expires_at,special_fulfillment)
  values(p_user,p_user,p_payload->>'client_name',p_payload->>'client_phone',delivery_method,
    case when delivery_method='delivery' then p_payload->>'delivery_address' else null end,payment_method,
    round(subtotal+delivery,2),round((subtotal+delivery)*rate),rate,p_payload->>'order_currency',items,
    case when payment_method='online_card' then 'Ожидает оплаты' else 'Активный' end,'pending',special,p_key,case when payment_method='online_card' then clock_timestamp()+interval '30 minutes' else null end,cardinality(request_ids)=1)
  returning * into o;
  update public.china_requests set reserved_order_id=o.id where id=any(request_ids);
  perform private.store_queue_order_notifications(o.id);
  return to_jsonb(o);
end $function$;


CREATE OR REPLACE FUNCTION private.store_queue_order_notifications(p_order_id bigint)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.store_finalize_special_requests(p_order_id);
  insert into private.store_outbox(event_key,user_id,order_id,kind)
  select event.prefix||o.id,o.user_id,o.id,event.kind from public.orders o
  cross join (values ('order:','order'),('order-client:','order_client')) event(prefix,kind)
  where (not o.special_fulfillment or event.kind='order') and o.id=p_order_id and o.checkout_abandoned_at is null and o.status <> 'Отменён' and (o.payment_method <> 'online_card' or o.receipt_submitted_at is not null or o.payment_status = 'paid')
  on conflict(event_key) do nothing;
  select private.store_queue_special_order(p_order_id);
$function$;


CREATE OR REPLACE FUNCTION public.store_admin_confirm_payment(p_order_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into o from public.orders where id=p_order_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_order_id for update;
  if o.reservation_expires_at<=clock_timestamp() and o.payment_screenshot_url is null and o.payment_status='pending' then
    perform public.store_cancel_order(o.user_id,o.id,true);
    return false;
  end if;
  if o.payment_status='paid' and o.status<>'Отменён' then return true; end if;
  if o.status='Отменён' or o.stock_released or o.payment_status is distinct from 'pending' then return false; end if;
  if o.special_fulfillment and (o.payment_method<>'online_card' or o.receipt_submitted_at is null or o.payment_screenshot_url is null) then return false; end if;
  update public.orders set status=case when o.special_fulfillment then 'Принят' else 'Активный' end,payment_status='paid',paid_at=now(),payment_provider='manual',reservation_expires_at=null where id=p_order_id;
  perform private.store_queue_order_notifications(p_order_id);
  return true;
end $function$;


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
  update public.orders set status='Отменён',stock_released=true,
    payment_status=case when o.payment_status='paid' then 'refund_pending' else 'cancelled' end
    where id=p_order_id returning * into o;
  if o.special_fulfillment then
    perform private.store_queue_special_order(o.id);
    begin perform private.store_wake_worker(); exception when others then null; end;
  end if;
  return to_jsonb(o);
end $function$;


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
    and kind in ('order','order_client') and sent_at is null;
  if o.special_fulfillment and not draft then perform private.store_queue_special_order(o.id); end if;
  return true;
end $function$;


CREATE OR REPLACE FUNCTION public.store_admin_order_status(p_id bigint, p_status text, p_courier text DEFAULT NULL::text, p_notice jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; allowed text[]; cancelled jsonb;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  select * into o from public.orders where id=p_id;
  if not found then raise exception 'Заказ недоступен'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_id for update;
  if o.special_fulfillment then
    perform private.store_retire_legacy_notice(o.user_id,p_notice);
    if o.status=p_status then return to_jsonb(o); end if;
    if p_status='Отменён' then return public.store_admin_cancel_order(p_id); end if;
    if o.status='Отменён' or o.stock_released or o.payment_status is distinct from 'paid' or o.paid_at is null then raise exception 'Сначала подтвердите полную оплату'; end if;
    allowed:=case o.status
      when 'Принят' then array['Заказан у поставщика']
      when 'Заказан у поставщика' then array['В пути']
      when 'В пути' then array['Прибыл в страну']
      when 'Прибыл в страну' then array['Собирается']
      when 'Собирается' then case when o.delivery_method='pickup' then array['Готов к выдаче'] else array['Упакован'] end
      when 'Готов к выдаче' then array['Получен']
      when 'Упакован' then array['Передан курьеру']
      when 'Передан курьеру' then array['Доставлен']
      else array[]::text[] end;
    if p_status is null or not p_status=any(allowed) then raise exception 'Недопустимый переход статуса'; end if;
    p_courier:=nullif(btrim(p_courier),'');
    if p_courier is not null and (p_courier !~* '^https?://[^[:space:]<>"]+$' or length(p_courier)>2000) then raise exception 'Некорректная ссылка курьера'; end if;
    update public.orders set status=p_status,courier_link=case when p_status='Передан курьеру' then coalesce(p_courier,courier_link) else courier_link end where id=p_id returning * into o;
    perform private.store_queue_special_order(o.id);
    begin perform private.store_wake_worker(); exception when others then null; end;
    return to_jsonb(o);
  end if;
  if p_status='Отменён' then
    cancelled:=public.store_admin_cancel_order(p_id);
    if cancelled is not null then perform private.store_admin_notice(cancelled->>'user_id',p_notice); end if;
    return cancelled;
  end if;
  select * into o from public.orders where id=p_id;
  if not found then raise exception 'Заказ недоступен'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_id for update;
  if o.status=p_status then perform private.store_admin_notice(o.user_id,p_notice); return to_jsonb(o); end if;
  if o.status='Отменён' or o.stock_released or o.payment_status in ('cancelled','refund_pending') then raise exception 'Отменённый заказ нельзя возобновить'; end if;
  if o.payment_method='online_card' and (o.payment_status is distinct from 'paid' or o.paid_at is null) then raise exception 'Сначала подтвердите оплату'; end if;
  allowed:=case o.status when 'Активный' then array['В обработке','Готов','Выдан'] when 'В обработке' then array['Готов','Выдан'] when 'Готов' then array['Выдан'] when 'Выдан' then array['Доставлен'] else array[]::text[] end;
  if not p_status=any(allowed) or (p_status='Доставлен' and o.delivery_method<>'delivery') then raise exception 'Недопустимый переход статуса'; end if;
  p_courier:=nullif(btrim(p_courier),'');
  if p_courier is not null and (p_courier !~* '^https?://' or length(p_courier)>2000) then raise exception 'Некорректная ссылка курьера'; end if;
  update public.orders set status=p_status,courier_link=coalesce(p_courier,courier_link),
    payment_status=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'paid' else payment_status end,
    paid_at=case when o.payment_method='upon_receipt' and p_status='Выдан' then coalesce(paid_at,now()) else paid_at end,
    payment_provider=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'manual' else payment_provider end
    where id=p_id returning * into o;
  perform private.store_admin_notice(o.user_id,p_notice);
  return to_jsonb(o);
end $function$;


create or replace function public.store_admin_confirm_payment_with_notice(p_order_id bigint,p_notice jsonb default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
 if not public.store_is_admin() then raise insufficient_privilege; end if;
 if not public.store_admin_confirm_payment(p_order_id) then return false; end if;
 select * into o from public.orders where id=p_order_id;
 if o.special_fulfillment then
   perform private.store_retire_legacy_notice(o.user_id,p_notice);
   begin perform private.store_wake_worker(); exception when others then null; end;
 else perform private.store_admin_notice(o.user_id,p_notice); end if;
 return true;
end $$;

CREATE OR REPLACE FUNCTION public.store_pending_notifications()
 RETURNS SETOF private.store_outbox
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select e.* from private.store_outbox e where e.sent_at is null
 and (e.claimed_at is null or e.claimed_at<now()-make_interval(secs=>least(3600,greatest(60,e.attempts*60))))
 and (e.kind not in ('order','order_client') or exists(select 1 from public.orders o where o.id=e.order_id and o.user_id=e.user_id and o.checkout_abandoned_at is null and o.status<>'Отменён' and (o.payment_method<>'online_card' or o.receipt_submitted_at is not null or o.payment_status='paid')))
 and (e.payload->'special_request' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_request,id}'=e.payload#>>'{special_request,id}'))
 and (e.payload->'special_order' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_order,id}'=e.payload#>>'{special_order,id}'))
 order by e.id limit 10;
$function$;

