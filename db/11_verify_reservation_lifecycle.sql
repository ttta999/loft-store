begin;
set local role service_role;
do $$
declare product uuid:=gen_random_uuid(); variant uuid:=gen_random_uuid(); payload jsonb;
  result jsonb; expired_id bigint; receipt_id bigint; request_key uuid:=gen_random_uuid(); n integer; o public.orders%rowtype;
begin
  insert into public.categories(id,name_ru,name_uz) values('shoes','Обувь','Shoes') on conflict do nothing;
  update public.categories set is_active=true where id='shoes';
  insert into public.settings(key,value) values('exchange_rate','{"rate":12000}'),('sale_mode_enabled','{"enabled":false}')
    on conflict(key) do update set value=excluded.value;
  insert into public.products(id,name_ru,name_uz,category,price_usd,images,size_type,is_active)
    values(product,'Reservation fixture','Reservation fixture','shoes',20,array[]::text[],'numeric',true);
  insert into public.product_variants(id,product_id,size_value,stock) values(variant,product,'42',30);
  payload:=jsonb_build_object('client_name','Reservation test','client_phone','+998901234567',
    'delivery_method','pickup','payment_method','online_card','order_currency','UZS','expected_total_usd',20,'expected_total_uzs',240000,
    'items',jsonb_build_array(jsonb_build_object('productId',product,'size','42','quantity',1)));
  result:=public.store_create_order('900000201',payload,request_key);
  expired_id:=(result->>'id')::bigint;
  if (result->>'reservation_expires_at')::timestamptz is null then raise exception 'TEST FAILED: no reservation expiry'; end if;
  update public.orders set reservation_expires_at=clock_timestamp()-interval '1 minute' where id=expired_id;
  if public.store_save_screenshot('900000201',expired_id,'private:payment-screenshots/900000201/fake.png') then raise exception 'TEST FAILED: expired receipt accepted'; end if;
  perform private.store_expire_reservations('900000201');
  select * into o from public.orders where id=expired_id;
  if o.status<>'Отменён' or not o.stock_released or o.reservation_expired_at is null then raise exception 'TEST FAILED: expiration'; end if;
  perform private.store_expire_reservations('900000201');
  if (select stock from public.product_variants where id=variant)<>30 then raise exception 'TEST FAILED: duplicate stock return'; end if;
  result:=public.store_create_order('900000201',payload,request_key);
  if result->>'status'<>'Отменён' then raise exception 'TEST FAILED: retry recreated expired order'; end if;
  result:=public.store_create_order('900000201',payload,gen_random_uuid());
  receipt_id:=(result->>'id')::bigint;
  if not public.store_save_screenshot('900000201',receipt_id,'private:payment-screenshots/900000201/receipt.png') then raise exception 'TEST FAILED: valid receipt rejected'; end if;
  if (select reservation_expires_at from public.orders where id=receipt_id) is not null then raise exception 'TEST FAILED: receipt did not pause expiry'; end if;
  update public.orders set reservation_expires_at=clock_timestamp()-interval '1 minute' where id=receipt_id;
  perform private.store_expire_reservations('900000201');
  if (select status from public.orders where id=receipt_id)<>'Ожидает оплаты' then raise exception 'TEST FAILED: receipt order expired'; end if;
  perform public.store_create_order('900000201',payload,gen_random_uuid());
  perform public.store_create_order('900000201',payload,gen_random_uuid());
  begin
    perform public.store_create_order('900000201',payload,gen_random_uuid());
    raise exception 'TEST FAILED: fourth pending order accepted';
  exception when others then if sqlerrm<>'Reservation limit' then raise; end if; end;
  payload:=jsonb_set(jsonb_set(jsonb_set(payload,'{items,0,quantity}','10'),'{expected_total_usd}','200'),'{expected_total_uzs}','2400000');
  result:=public.store_create_order('900000202',payload,gen_random_uuid());
  payload:=jsonb_set(jsonb_set(jsonb_set(payload,'{items,0,quantity}','1'),'{expected_total_usd}','20'),'{expected_total_uzs}','240000');
  begin
    perform public.store_create_order('900000202',payload,gen_random_uuid());
    raise exception 'TEST FAILED: total pending quantity exceeded';
  exception when others then if sqlerrm<>'Reservation limit' then raise; end if; end;
end $$;
select 'reservation lifecycle checks passed' as result;
rollback;
