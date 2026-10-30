-- Reproduce the reported delivery-threshold mismatch without persisting an order.
begin;
set local role service_role;
do $$
declare product uuid:=gen_random_uuid(); variant uuid:=gen_random_uuid(); result jsonb; total numeric;
begin
  insert into public.categories(id,name_ru,name_uz) values('shoes','Обувь','Shoes') on conflict do nothing;
  update public.categories set is_active=true where id='shoes';
  insert into public.settings(key,value) values('exchange_rate','{"rate":11843.74}'),('sale_mode_enabled','{"enabled":false}'),('delivery_price','{"price":30000}'),('free_delivery_threshold','{"amount":2500000}')
    on conflict(key) do update set value=excluded.value;
  insert into public.products(id,name_ru,name_uz,category,price_usd,images,size_type,is_active)
    values(product,'Checkout rate fixture','Checkout rate fixture','shoes',210,array[]::text[],'numeric',true);
  insert into public.product_variants(id,product_id,size_value,stock) values(variant,product,'42',1);
  total:=210+30000/11843.74;
  result:=public.store_create_order('900000123',jsonb_build_object(
    'client_name','Rate test','client_phone','+998901234567','delivery_method','delivery','delivery_address','Test fixture address',
    'payment_method','online_card','order_currency','UZS','expected_total_usd',total,'expected_total_uzs',2517185,
    'items',jsonb_build_array(jsonb_build_object('productId',product,'size','42','quantity',1))),gen_random_uuid());
  if (result->>'total_price_uzs')::numeric<>2517185 or (result->>'exchange_rate_at_order')::numeric<>11843.74
    then raise exception 'Checkout rate regression'; end if;
  if not public.store_cancel_order('900000123',(result->>'id')::bigint,true) then raise exception 'Cleanup regression'; end if;
end $$;
select 'checkout rate and paid delivery checks passed' as result;
rollback;
