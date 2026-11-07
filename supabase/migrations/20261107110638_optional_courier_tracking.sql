CREATE OR REPLACE FUNCTION public.store_admin_order_status(p_id bigint, p_status text, p_courier text DEFAULT NULL::text, p_notice jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders%rowtype; allowed text[]; cancelled jsonb;
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
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
