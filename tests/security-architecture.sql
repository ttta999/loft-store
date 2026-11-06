-- Run together with the migration inside BEGIN ... ROLLBACK. No real messages/files.
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
  insert into public.categories(id,name_ru,name_uz,is_active) values('shoes','Обувь','Shoes',true) on conflict(id) do update set is_active=true;
  insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values(sub_id,'shoes','Fixture','Fixture','numeric','["42"]'::jsonb,true);
  insert into public.settings(key,value) values('exchange_rate','{"rate":12000}'),('sale_mode_enabled','{"enabled":false}') on conflict(key) do update set value=excluded.value;
  product:=jsonb_build_object('name_ru','Security fixture','name_uz','Security fixture','category','shoes','subcategory',sub_id,'price_usd',20,'images','[]'::jsonb,'size_type','numeric');
  colors:='[{"key":"new-color","name_ru":"Синий","images":[],"sort_order":0}]';
  variants:='[{"color_key":"new-color","size_value":"42","stock":2}]';
  pid:=public.store_admin_save_product(null,product,colors,variants,null);
  perform set_config('loft.test.product',pid::text,true);
  select id into cid from public.product_colors where product_id=pid;
  select id into vid from public.product_variants where product_id=pid;
  payload:=jsonb_build_object('client_name','Security fixture','client_phone','+998901234567','delivery_method','pickup','payment_method','online_card',
    'order_currency','UZS','expected_total_usd',20,'expected_total_uzs',240000,'items',jsonb_build_array(jsonb_build_object('productId',pid,'colorId',cid,'size','42','quantity',1)));
  result:=public.store_create_order('900000701',payload,gen_random_uuid()); oid:=(result->>'id')::bigint;
  baseline:=jsonb_build_object('version',0,'variants',jsonb_build_array(jsonb_build_object('id',vid,'stock',1)));
  colors:=jsonb_build_array(jsonb_build_object('key',cid,'name_ru','Синий','images','[]'::jsonb,'sort_order',0));
  variants:=jsonb_build_array(jsonb_build_object('color_key',cid,'size_value','42','stock',1));
  perform public.store_admin_save_product(pid,product||'{"name_ru":"Renamed fixture"}',colors,variants,baseline);
  if not exists(select 1 from public.product_variants where id=vid and color_id=cid and stock=1) then raise exception 'TEST FAILED: stable inventory identity'; end if;
  blocked:=false;
  begin perform public.store_admin_save_product(pid,product,colors,variants,baseline); exception when others then blocked:=true; end;
  if not blocked or (select catalog_version from public.products where id=pid)<>1 then raise exception 'TEST FAILED: stale write/atomic rollback'; end if;
  -- Invalid second colour must roll back the preceding product/name and first colour updates.
  baseline:=jsonb_build_object('version',1,'variants',jsonb_build_array(jsonb_build_object('id',vid,'stock',1)));
  blocked:=false;
  begin perform public.store_admin_save_product(pid,product||'{"name_ru":"Must roll back"}',colors||'[{"key":"invalid","name_ru":"","images":[],"sort_order":1}]',variants,baseline); exception when others then blocked:=true; end;
  if not blocked or (select name_ru from public.products where id=pid)<>'Renamed fixture' then raise exception 'TEST FAILED: partial catalogue write'; end if;
  -- Removing a colour with a reserved order is blocked; stock is never silently lost.
  blocked:=false;
  begin perform public.store_admin_save_product(pid,product,'[]','[]',baseline); exception when others then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: removed reserved colour'; end if;
  perform public.store_admin_cancel_order(oid);
  if (select stock from public.product_variants where id=vid)<>2 then raise exception 'TEST FAILED: stock not returned after edit'; end if;
  blocked:=false;
  begin perform public.store_admin_order_status(oid,'Активный'); exception when others then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: cancelled order revived'; end if;
  result:=public.store_create_order('900000701',payload||'{"payment_method":"upon_receipt"}',gen_random_uuid());
  result:=public.store_admin_order_status((result->>'id')::bigint,'Выдан',null,jsonb_build_object('key',gen_random_uuid(),'message','<b>Transaction-only fixture</b>'));
  if not exists(select 1 from private.store_outbox e where e.user_id='900000701' and e.kind='custom' and e.payload->>'message'='Transaction-only fixture') then raise exception 'TEST FAILED: status notification not committed atomically'; end if;
  if result->>'payment_status'<>'paid' or result->>'paid_at' is null then raise exception 'TEST FAILED: receipt payment not recorded'; end if;
  if not exists(select 1 from private.store_payment_audit where order_id=(result->>'id')::bigint and current_state->>'payment_status'='paid') then raise exception 'TEST FAILED: receipt payment missing audit'; end if;
  result:=public.store_create_order('900000701',payload,gen_random_uuid());oid:=(result->>'id')::bigint;
  if not public.store_save_screenshot('900000701',oid,'private:payment-screenshots/900000701/fixture.png') then raise exception 'TEST FAILED: receipt rejected'; end if;
  select reservation_expires_at into deadline from public.orders where id=oid;
  if deadline is null or deadline>now()+interval '24 hours 1 minute' then raise exception 'TEST FAILED: unbounded receipt reservation'; end if;
  perform public.store_save_screenshot('900000701',oid,'private:payment-screenshots/900000701/replacement.png');
  if (select reservation_expires_at from public.orders where id=oid)<>deadline then raise exception 'TEST FAILED: receipt refresh extends reservation'; end if;
  update public.orders set reservation_expires_at=now()-interval '1 minute' where id=oid;
  perform private.store_expire_reservations('900000701');
  if not exists(select 1 from public.orders where id=oid and status='Отменён' and stock_released) then raise exception 'TEST FAILED: fake receipt holds inventory forever'; end if;
  if (select sold_count from public.get_product_popularity() where product_id=pid::text)<>1 then raise exception 'TEST FAILED: unpaid popularity'; end if;
  perform public.store_register_session(repeat('a',64),'900000701');
  if not public.store_validate_session(repeat('a',64),'900000701') or public.store_validate_session(repeat('a',64),'900000702') then raise exception 'TEST FAILED: session ownership'; end if;
  perform public.store_admin_revoke_customer_sessions('900000701');
  if public.store_validate_session(repeat('a',64),'900000701') then raise exception 'TEST FAILED: session revocation'; end if;
  for i in 1..25 loop
    if not public.store_reserve_upload('900000702','china-requests','900000702/'||i||'.png',2097152) then raise exception 'TEST FAILED: premature upload quota'; end if;
  end loop;
  if public.store_reserve_upload('900000702','china-requests','900000702/excess.png',1) then raise exception 'TEST FAILED: unlimited uploads'; end if;
  if public.store_reserve_upload('900000702','china-requests','another-user/file.png',1) then raise exception 'TEST FAILED: upload ownership'; end if;
  if not public.store_product_available(pid,'42',1,cid) then raise exception 'TEST FAILED: available inventory hidden'; end if;
  perform public.store_admin_product_visibility(pid,false);
  if public.store_product_available(pid,'42',1,cid) or exists(select 1 from public.store_available_sizes(pid,cid)) then raise exception 'TEST FAILED: hidden product availability leaked'; end if;
  if has_function_privilege('anon','public.store_worker_authorized(text)','execute') or has_function_privilege('authenticated','public.store_register_session(text,text)','execute') then raise exception 'TEST FAILED: private server RPC exposed'; end if;
  if has_table_privilege('anon','public.product_variants','select') or has_table_privilege('authenticated','public.orders','update') then raise exception 'TEST FAILED: direct inventory/financial bypass'; end if;
  blocked:=false;
  begin insert into auth.users(id,email) values(gen_random_uuid(),'uninvited-fixture@fixture.invalid'); exception when others then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: public signup allowed'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',session_id,'role','authenticated','aal','aal1')::text,true);
  blocked:=false;
  begin perform public.store_admin_save_product(null,product,colors,variants,null); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: missing MFA accepted'; end if;
end $$;
select 'atomic catalogue, inventory identity, stale writes, status guards, receipt payment, bounded reservations, private stock, sessions, quotas, signup and MFA checks passed' as result;

set local role anon;
do $$ begin
  if exists(select 1 from public.products where id=current_setting('loft.test.product')::uuid) then raise exception 'TEST FAILED: unpublished product accessible to anon'; end if;
  if exists(select 1 from public.product_popularity where product_id=current_setting('loft.test.product')::uuid) then raise exception 'TEST FAILED: unpublished popularity accessible to anon'; end if;
end $$;
reset role;
