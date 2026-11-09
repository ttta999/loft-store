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
do $$
declare pid uuid:=gen_random_uuid(); sub_id text:='abandon-'||gen_random_uuid(); customer text:=(800000000000000+floor(random()*100000000000000))::bigint::text;
  payload jsonb; result jsonb; oid bigint; confirmed bigint; cash bigint; request_id text; checkout_key uuid:=gen_random_uuid();
begin
  insert into public.categories(id,name_ru,name_uz,is_active) values('shoes','Обувь','Shoes',true) on conflict(id) do update set is_active=true;
  insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values(sub_id,'shoes','Fixture','Fixture','numeric','["42"]',true);
  insert into public.products(id,name_ru,name_uz,category,subcategory,price_usd,images,size_type,is_active) values(pid,'Draft fixture','Draft fixture','shoes',sub_id,20,array[]::text[],'numeric',true);
  insert into public.product_variants(product_id,size_value,stock) values(pid,'42',10);
  update public.settings set value='{"rate":12000}' where key='exchange_rate';
  update public.settings set value='{"enabled":false}' where key='sale_mode_enabled';
  payload:=jsonb_build_object('client_name','Draft fixture','client_phone','+998901234567','delivery_method','pickup','payment_method','online_card','order_currency','USD','expected_total_usd',40,'items',jsonb_build_array(jsonb_build_object('productId',pid,'size','42','quantity',2)));
  result:=public.store_create_order(customer,payload,checkout_key); oid:=(result->>'id')::bigint;
  if (select stock from public.product_variants where product_id=pid)<>8 then raise exception 'TEST FAILED: reservation'; end if;
  if exists(select 1 from private.store_outbox where order_id=oid and kind in ('order','order_client')) then raise exception 'TEST FAILED: draft notification queued'; end if;
  -- A stale event from a pre-upgrade worker must also be unable to send.
  insert into private.store_outbox(event_key,user_id,order_id,kind) values('order:'||oid,customer,oid,'order');
  if public.store_claim_notification(customer,'order',oid) is not null or public.store_claim_notification(customer,'order_client',oid) is not null then raise exception 'TEST FAILED: draft claim'; end if;
  if exists(select 1 from public.store_pending_notifications() where order_id=oid and kind in ('order','order_client')) then raise exception 'TEST FAILED: draft worker selection'; end if;
  if public.store_cancel_order(customer||'1',oid,true) then raise exception 'TEST FAILED: another customer cancelled order'; end if;
  if not public.store_cancel_order(customer,oid,true) or not public.store_cancel_order(customer,oid,true) then raise exception 'TEST FAILED: cancellation/retry'; end if;
  if (select stock from public.product_variants where product_id=pid)<>10 then raise exception 'TEST FAILED: stock not restored exactly once'; end if;
  if (select checkout_abandoned_at from public.orders where id=oid) is null then raise exception 'TEST FAILED: abandoned history marker'; end if;
  if public.store_save_screenshot(customer,oid,'private:payment-screenshots/'||customer||'/late.png') then raise exception 'TEST FAILED: cancelled upload accepted'; end if;
  result:=public.store_create_order(customer,payload,checkout_key);
  if (result->>'id')::bigint<>oid or result->>'checkout_abandoned_at' is null or (select stock from public.product_variants where product_id=pid)<>10 then raise exception 'TEST FAILED: replay reserved stock'; end if;
  perform set_config('loft.test.abandoned',oid::text,true);
  result:=public.store_create_order(customer,payload,gen_random_uuid()); confirmed:=(result->>'id')::bigint;
  if not public.store_save_screenshot(customer,confirmed,'private:payment-screenshots/'||customer||'/receipt.png') then raise exception 'TEST FAILED: receipt submission'; end if;
  perform public.store_save_screenshot(customer,confirmed,'private:payment-screenshots/'||customer||'/receipt-2.png');
  if (select count(*) from private.store_outbox where order_id=confirmed and kind in ('order','order_client'))<>2 then raise exception 'TEST FAILED: receipt notifications duplicated/missing'; end if;
  if public.store_cancel_order(customer,confirmed,true) then raise exception 'TEST FAILED: submitted order discarded as draft'; end if;
  if public.store_claim_notification(customer,'order',confirmed) is null then raise exception 'TEST FAILED: real order cannot notify'; end if;
  if public.store_claim_notification(customer,'order',confirmed) is not null then raise exception 'TEST FAILED: duplicate real order claim'; end if;
  if not public.store_cancel_order(customer,confirmed,false) or (select checkout_abandoned_at from public.orders where id=confirmed) is not null then raise exception 'TEST FAILED: real cancellation hidden'; end if;
  if (select stock from public.product_variants where product_id=pid)<>10 then raise exception 'TEST FAILED: submitted cancellation stock'; end if;
  result:=public.store_create_order(customer,payload||'{"payment_method":"upon_receipt"}',gen_random_uuid()); cash:=(result->>'id')::bigint;
  if (select count(*) from private.store_outbox where order_id=cash and kind in ('order','order_client'))<>2 then raise exception 'TEST FAILED: cash order notification'; end if;
  if public.store_cancel_order(customer,cash,true) then raise exception 'TEST FAILED: cash order deleted as draft'; end if;
  perform public.store_cancel_order(customer,cash,false);
  result:=public.store_create_request(customer,'{"product_name":"Special draft fixture"}',gen_random_uuid()); request_id:=result->>'id';
  update public.china_requests set status='Оценён',manager_price=40 where id::text=request_id;
  result:=public.store_create_order(customer,payload||jsonb_build_object('special_order_id',request_id,'items',jsonb_build_array(jsonb_build_object('productId','special-'||request_id,'size','42','quantity',1,'isSpecialOrder',true))),gen_random_uuid());
  oid:=(result->>'id')::bigint;
  if not public.store_cancel_order(customer,oid,true) then raise exception 'TEST FAILED: special draft cancellation'; end if;
  if not exists(select 1 from public.china_requests where id::text=request_id and status='Оценён' and converted_to_order_id is null) then raise exception 'TEST FAILED: quote not restored'; end if;
  if exists(select 1 from private.store_outbox where order_id=oid and kind in ('order','order_client')) then raise exception 'TEST FAILED: special draft message'; end if;
end $$;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.orders where id=current_setting('loft.test.abandoned')::bigint) then raise exception 'TEST FAILED: admin history includes abandoned checkout'; end if;
end $$;
reset role;
select 'abandoned checkout: stock, retries, hidden history, no notifications, receipt/cash submission and special quote restoration passed' as result;
