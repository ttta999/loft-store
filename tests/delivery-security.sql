-- Execute inside BEGIN ... ROLLBACK; no test recipient may be committed.
do $$
declare admin_id uuid:=gen_random_uuid(); session_id uuid:=gen_random_uuid();
  pid uuid; cid uuid; vid uuid; oid bigint; sub_id text:='fixture-'||gen_random_uuid();
  product jsonb; colors jsonb; variants jsonb; baseline jsonb; result jsonb; payload jsonb;
  deadline timestamptz; blocked boolean; i integer;
begin
  insert into private.store_registration_invites values(encode(extensions.digest(admin_id::text||'@fixture.invalid','sha256'),'hex'),now()+interval '1 hour');
  insert into auth.users(id,aud,role,email,created_at,updated_at) values(admin_id,'authenticated','authenticated',admin_id::text||'@fixture.invalid',now(),now());
  insert into private.store_admins(user_id,mfa_required) values(admin_id,true);
  insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(session_id,admin_id,now(),now(),'aal2');
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at)
    values(gen_random_uuid(),admin_id,'Transaction-only security fixture','totp','verified',now(),now());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',session_id,'role','authenticated','aal','aal2')::text,true);
end $$;
set local role authenticated;
do $$
declare blocked boolean; before_price jsonb; i numeric;
begin
  perform public.store_admin_save_delivery(2.52,200);
  if (select (value->>'price_usd')::numeric from public.settings where key='delivery_price')<>2.52 then raise exception 'TEST FAILED: USD write'; end if;
  select value into before_price from public.settings where key='delivery_price';
  foreach i in array array[-1,0.001,1000001,'NaN'::numeric] loop
    blocked:=false;
    begin perform public.store_admin_save_delivery(3,i); exception when others then blocked:=true; end;
    if not blocked or (select value from public.settings where key='delivery_price')<>before_price then raise exception 'TEST FAILED: invalid/partial settings write'; end if;
  end loop;
  perform set_config('request.jwt.claims',((current_setting('request.jwt.claims')::jsonb)||'{"aal":"aal1"}')::text,true);
  blocked:=false;
  begin perform public.store_admin_save_delivery(5,100); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: missing MFA'; end if;
end $$;
reset role;
set local role anon;
do $$
declare blocked boolean:=false;
begin
  begin perform public.store_admin_save_delivery(5,100); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: anonymous delivery write'; end if;
end $$;
reset role;
do $$
declare pid uuid:=gen_random_uuid(); sub_id text:='delivery-fixture-'||gen_random_uuid(); customer text; payload jsonb; result jsonb; price numeric; total numeric; n integer:=0;
begin
  insert into public.categories(id,name_ru,name_uz,is_active) values('shoes','Обувь','Shoes',true) on conflict(id) do update set is_active=true;
  insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values(sub_id,'shoes','Fixture','Fixture','numeric','["42"]',true);
  insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,images,size_type,is_active) values(pid,'Delivery fixture','Delivery fixture','shoes',sub_id,160,array[]::text[],'numeric',true);
  insert into public.product_variants(product_id,size_value,stock) values(pid,'42',10);
  update public.settings set value='{"rate":11910.62}' where key='exchange_rate';
  update public.settings set value='{"enabled":false}' where key='sale_mode_enabled';
  foreach price in array array[160,199.99,200] loop
    update public.products set price_usd=price where id=pid;
    total:=case when price>=200 then price else price+2.52 end;
    n:=n+1; customer:='90000082'||n;
    payload:=jsonb_build_object('client_name','Delivery fixture','client_phone','+998901234567','delivery_method','delivery','delivery_address','Fixture address 15','payment_method','online_card','order_currency','USD','expected_total_usd',total,'items',jsonb_build_array(jsonb_build_object('productId',pid,'size','42','quantity',1)));
    result:=public.store_create_order(customer,payload,gen_random_uuid());
    if (result->>'total_price_usd')::numeric<>total or (result->>'total_price_uzs')::numeric<>round(total*11910.62) then raise exception 'TEST FAILED: USD/UZS server totals'; end if;
    n:=n+1; payload:=payload||jsonb_build_object('order_currency','UZS','expected_total_uzs',round(total*11910.62));
    result:=public.store_create_order('90000082'||n,payload,gen_random_uuid());
    if (result->>'total_price_uzs')::numeric<>round(total*11910.62) then raise exception 'TEST FAILED: UZS checkout'; end if;
  end loop;
end $$;
select 'delivery: MFA-only atomic settings, invalid-value rejection, USD/UZS totals and threshold boundary passed' as result;
