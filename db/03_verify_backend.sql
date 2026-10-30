-- Run with an administrative connection. All fixture data is rolled back.
begin;
set local role service_role;
do $$
declare
  product uuid := gen_random_uuid(); variant uuid := gen_random_uuid(); color uuid := gen_random_uuid();
  first_key uuid := gen_random_uuid(); second_key uuid := gen_random_uuid(); special_key uuid := gen_random_uuid();
  payload jsonb; result jsonb; repeated jsonb; order_id bigint; request_id bigint; before_stock integer; after_stock integer;
begin
  insert into public.categories(id,name_ru,name_uz) values('shoes','Обувь','Shoes') on conflict do nothing;
  update public.categories set is_active=true where id='shoes';
  insert into public.settings(key,value) values('exchange_rate','{"rate":12000}'),('sale_mode_enabled','{"enabled":false}'),('delivery_price','{"price":30000}'),('free_delivery_threshold','{"amount":2500000}')
    on conflict(key) do update set value=excluded.value;
  insert into public.products(id,name_ru,name_uz,category,price_usd,images,size_type,is_active,sale_price)
    values(product,'Security fixture','Security fixture','shoes',20,array[]::text[],'numeric',true,15);
  insert into public.product_colors(id,product_id,name_ru) values(color,product,'Красный');
  insert into public.product_variants(id,product_id,size_value,stock,color_id) values(variant,product,'42',2,color);
  payload:=jsonb_build_object('client_name','Security test','client_phone','+998901234567','delivery_method','pickup','payment_method','upon_receipt','order_currency','UZS','expected_total_usd',20,
    'items',jsonb_build_array(jsonb_build_object('productId',product,'size','42','colorId',color,'quantity',1,'priceUsd',0.01)), 'payment_status','paid','user_id','another-user');
  result:=public.store_create_order('900000001',payload,first_key);
  order_id:=(result->>'id')::bigint;
  if result->>'user_id'<>'900000001' or result->>'payment_status'<>'pending' or (result->>'total_price_usd')::numeric<>20 then raise exception 'SECURITY TEST FAILED: trusted client fields'; end if;
  select stock into after_stock from public.product_variants where id=variant;
  if after_stock<>1 then raise exception 'SECURITY TEST FAILED: stock reservation'; end if;
  repeated:=public.store_create_order('900000001',payload,first_key);
  if result->>'id'<>repeated->>'id' then raise exception 'SECURITY TEST FAILED: duplicate order'; end if;
  if public.store_cancel_order('900000002',order_id,false) then raise exception 'SECURITY TEST FAILED: cross-user cancellation'; end if;
  if public.store_save_screenshot('900000002',order_id,'private:payment-screenshots/another.png') then raise exception 'SECURITY TEST FAILED: cross-user receipt'; end if;
  if not public.store_cancel_order('900000001',order_id,false) or not public.store_cancel_order('900000001',order_id,false) then raise exception 'SECURITY TEST FAILED: cancel retry'; end if;
  select stock into after_stock from public.product_variants where id=variant;
  if after_stock<>2 then raise exception 'SECURITY TEST FAILED: double stock restore'; end if;
  repeated:=public.store_create_order('900000001',payload,first_key);
  if repeated->>'status'<>'Отменён' then raise exception 'SECURITY TEST FAILED: resurrected order'; end if;
  begin
    perform public.store_create_order('900000001',jsonb_set(payload,'{expected_total_usd}','0.01'),gen_random_uuid());
    raise exception 'SECURITY TEST FAILED: forged total accepted';
  exception when others then
    if sqlerrm<>'Price changed' then raise; end if;
  end;
  select stock into after_stock from public.product_variants where id=variant;
  if after_stock<>2 then raise exception 'SECURITY TEST FAILED: rollback stock'; end if;
  begin
    perform public.store_create_order('900000001',jsonb_set(jsonb_set(payload,'{items,0,quantity}','3'),'{expected_total_usd}','60'),gen_random_uuid());
    raise exception 'SECURITY TEST FAILED: oversell';
  exception when others then
    if sqlerrm<>'Not enough stock' then raise; end if;
  end;
  -- Delivery price and sale price are recalculated in the database.
  update public.settings set value='{"enabled":true}' where key='sale_mode_enabled';
  payload:=jsonb_set(payload,'{expected_total_usd}','17.5') || '{"delivery_method":"delivery","delivery_address":"Test address","payment_method":"online_card"}'::jsonb;
  result:=public.store_create_order('900000001',payload,second_key);
  if (result->>'total_price_usd')::numeric<>17.5 or (result->>'total_price_uzs')::numeric<>210000 then raise exception 'SECURITY TEST FAILED: delivery/sale pricing'; end if;
  if not public.store_save_screenshot('900000001',(result->>'id')::bigint,'private:payment-screenshots/900000001/receipt.png') then raise exception 'SECURITY TEST FAILED: own receipt'; end if;
  if public.store_cancel_order('900000001',(result->>'id')::bigint,true) then raise exception 'SECURITY TEST FAILED: cleanup removed receipt'; end if;
  insert into public.china_requests(user_id,product_name,link,status,manager_price) values('900000001','Special security fixture','','Оценён',30) returning id into request_id;
  payload:=payload || jsonb_build_object('special_order_id',request_id::text,'delivery_method','pickup','expected_total_usd',30);
  result:=public.store_create_order('900000001',payload,special_key);
  if result->>'payment_status'<>'pending' then raise exception 'SECURITY TEST FAILED: unpaid special order marked paid'; end if;
  if not exists(select 1 from public.china_requests where id=request_id and status='Ожидает оплаты' and converted_to_order_id=result->>'id') then raise exception 'SECURITY TEST FAILED: special order conversion'; end if;
  if not public.store_cancel_order('900000001',(result->>'id')::bigint,true) then raise exception 'SECURITY TEST FAILED: special cancel'; end if;
  if not exists(select 1 from public.china_requests where id=request_id and status='Оценён' and converted_to_order_id is null) then raise exception 'SECURITY TEST FAILED: special restore'; end if;
  if has_function_privilege('anon','public.store_create_order(text,jsonb,uuid)','execute') or has_function_privilege('authenticated','public.store_cancel_order(text,bigint,boolean)','execute') then raise exception 'SECURITY TEST FAILED: public RPC'; end if;
end $$;
rollback;
