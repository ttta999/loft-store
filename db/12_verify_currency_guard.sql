begin;
set local role service_role;
do $$
declare product uuid:=gen_random_uuid(); variant uuid:=gen_random_uuid(); payload jsonb; result jsonb;
begin
  insert into public.categories(id,name_ru,name_uz) values('shoes','Обувь','Shoes') on conflict do nothing;
  update public.categories set is_active=true where id='shoes';
  insert into public.settings(key,value) values('exchange_rate','{"rate":12500}'),('sale_mode_enabled','{"enabled":false}')
    on conflict(key) do update set value=excluded.value;
  insert into public.products(id,name_ru,name_uz,category,price_usd,images,size_type,is_active)
    values(product,'Currency fixture','Currency fixture','shoes',20,array[]::text[],'numeric',true);
  insert into public.product_variants(id,product_id,size_value,stock) values(variant,product,'42',5);
  -- Customer reviewed 240000 UZS at 12000. Same USD price at 12500 is not consent to 250000 UZS.
  payload:=jsonb_build_object('client_name','Currency test','client_phone','+998901234567',
    'delivery_method','pickup','payment_method','online_card','order_currency','UZS','expected_total_usd',20,'expected_total_uzs',240000,
    'items',jsonb_build_array(jsonb_build_object('productId',product,'size','42','quantity',1)));
  begin
    perform public.store_create_order('900000203',payload,gen_random_uuid());
    raise exception 'TEST FAILED: changed UZS total accepted';
  exception when others then if sqlerrm<>'Price changed' then raise; end if; end;
  if (select stock from public.product_variants where id=variant)<>5 then raise exception 'TEST FAILED: price error consumed stock'; end if;
  result:=public.store_create_order('900000203',jsonb_set(payload,'{expected_total_uzs}','250000'),gen_random_uuid());
  if (result->>'total_price_uzs')::numeric<>250000 then raise exception 'TEST FAILED: correct UZS total'; end if;
  -- USD checkout is checked in USD, independent of an informational UZS conversion.
  result:=public.store_create_order('900000204',jsonb_set(payload,'{order_currency}','"USD"'),gen_random_uuid());
  if (result->>'total_price_usd')::numeric<>20 then raise exception 'TEST FAILED: USD total'; end if;
  begin
    perform public.store_create_order('900000204',jsonb_set(jsonb_set(payload,'{order_currency}','"USD"'),'{expected_total_usd}','19.99'),gen_random_uuid());
    raise exception 'TEST FAILED: changed USD total accepted';
  exception when others then if sqlerrm<>'Price changed' then raise; end if; end;
end $$;
select 'chosen currency checks passed' as result;
rollback;
