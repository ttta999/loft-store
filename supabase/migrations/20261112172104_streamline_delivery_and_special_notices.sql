-- Direct courier handoff after assembly. Legacy packed orders remain resumable.
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
    if p_status='Отменён' then raise exception 'Укажите причину отмены в отдельном действии'; end if;
    if o.status='Отменён' or o.stock_released or o.payment_status is distinct from 'paid' or o.paid_at is null then raise exception 'Сначала подтвердите полную оплату'; end if;
    allowed:=case o.status
      when 'Принят' then array['Заказан у поставщика']
      when 'Заказан у поставщика' then array['В пути']
      when 'В пути' then array['Прибыл в страну']
      when 'Прибыл в страну' then array['Собирается']
      when 'Собирается' then case when o.delivery_method='pickup' then array['Готов к выдаче'] else array['Передан курьеру'] end
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
  if p_status='Отменён' then raise exception 'Укажите причину отмены в отдельном действии'; end if;
  select * into o from public.orders where id=p_id;
  if not found then raise exception 'Заказ недоступен'; end if;
  perform pg_advisory_xact_lock(hashtextextended('store-user:'||o.user_id,0));
  select * into o from public.orders where id=p_id for update;
  perform private.store_retire_legacy_notice(o.user_id,p_notice);
  if o.status=p_status then return to_jsonb(o); end if;
  if o.status='Отменён' or o.stock_released or o.payment_status in ('cancelled','refund_pending') then raise exception 'Отменённый заказ нельзя возобновить'; end if;
  if o.payment_method='online_card' and (o.payment_status is distinct from 'paid' or o.paid_at is null) then raise exception 'Сначала подтвердите оплату'; end if;
  allowed:=case o.status when 'Активный' then array['В обработке'] when 'В обработке' then case when o.delivery_method='delivery' then array['Выдан'] else array['Готов'] end when 'Готов' then array['Выдан'] when 'Упакован' then case when o.delivery_method='delivery' then array['Выдан'] else array[]::text[] end when 'Выдан' then array['Доставлен'] else array[]::text[] end;
  if p_status is null or not p_status=any(allowed) or (p_status='Доставлен' and o.delivery_method<>'delivery') then raise exception 'Недопустимый переход статуса'; end if;
  p_courier:=nullif(btrim(p_courier),'');
  if p_courier is not null and (p_courier !~* '^https?://' or length(p_courier)>2000) then raise exception 'Некорректная ссылка курьера'; end if;
  if o.payment_method='upon_receipt' and p_status='Выдан' and (o.order_currency not in ('USD','UZS') or private.store_order_amount(o,o.order_currency) is null) then raise exception 'Проверьте сумму и валюту заказа'; end if;
  update public.orders set status=p_status,courier_link=coalesce(p_courier,courier_link),
    payment_amount=case when o.payment_method='upon_receipt' and p_status='Выдан' then private.store_order_amount(o,o.order_currency) else payment_amount end,
    payment_currency=case when o.payment_method='upon_receipt' and p_status='Выдан' then o.order_currency else payment_currency end,
    payment_status=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'paid' else payment_status end,
    paid_at=case when o.payment_method='upon_receipt' and p_status='Выдан' then coalesce(paid_at,now()) else paid_at end,
    payment_provider=case when o.payment_method='upon_receipt' and p_status='Выдан' then 'manual' else payment_provider end
    where id=p_id returning * into o;
  perform private.store_queue_ordinary_order(o.id);
  begin perform private.store_wake_worker(); exception when others then null; end;
  return to_jsonb(o);
end $function$;


-- Quote storage stays USD. Only its notification carries the current store-rate snapshot.
create or replace function private.store_queue_special_status(p_id bigint) returns void language sql set search_path='' as $$
 insert into private.store_outbox(event_key,user_id,kind,payload)
 select 'special-status:'||r.id||':'||r.status,r.user_id,'custom',jsonb_build_object('special_request',jsonb_build_object(
 'id',r.id,'status',r.status,'manager_price',r.manager_price,'currency','USD',
 'exchange_rate',fx.rate,'amount_uzs',case when fx.rate>0 then round(r.manager_price*fx.rate) end,
 'manager_comment',r.manager_comment,'rejection_reason',r.rejection_reason,'order_id',r.converted_to_order_id))
 from public.china_requests r left join lateral (
 select case when value->>'rate' ~ '^[0-9]+(\.[0-9]+)?$' then (value->>'rate')::numeric end as rate
 from public.settings where key='exchange_rate'
 ) fx on true where r.id=p_id on conflict(event_key) do nothing;
$$;
-- Replacing functions preserves their existing grants; no orders or queued events are rewritten.
