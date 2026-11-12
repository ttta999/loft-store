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
declare customer text:=(800000000000000+floor(random()*100000000000000))::bigint::text;
 r1 bigint; r2 bigint; r3 bigint; oid bigint; did bigint; historical bigint; waiting_event bigint; accepted_event bigint; result jsonb; payload jsonb; other jsonb; blocked boolean; step text; key_id uuid:=gen_random_uuid();
begin
 update public.settings set value='{"rate":12000}' where key='exchange_rate';
 update public.settings set value='{"price_usd":2}' where key='delivery_price';
 update public.settings set value='{"amount_usd":1000}' where key='free_delivery_threshold';
 result:=public.store_create_request(customer,'{"product_name":"Pickup fixture","size_color":"42, синий"}',gen_random_uuid());r1:=(result->>'id')::bigint;
 perform public.store_admin_request_status(r1,'Оценён','{"manager_price":100}');
 result:=public.store_create_request(customer,'{"product_name":"Delivery fixture"}',gen_random_uuid());r2:=(result->>'id')::bigint;
 perform public.store_admin_request_status(r2,'Оценён','{"manager_price":50}');
 payload:=jsonb_build_object('client_name','Fixture buyer','client_phone','+998901234567','delivery_method','pickup','payment_method','online_card','order_currency','USD','expected_total_usd',100,
 'items',jsonb_build_array(jsonb_build_object('productId','special-'||r1,'size','42','quantity',1,'isSpecialOrder',true,'specialRequestId',r1,'priceUsd',1)));
 other:=jsonb_build_object('productId','special-'||r2,'size','42','quantity',1,'isSpecialOrder',true,'specialRequestId',r2);
 -- Direct RPC bypass attempts must fail, without claiming the request.
 foreach result in array array[
 payload||jsonb_build_object('items',(payload->'items')||jsonb_build_array(other)),
 payload||jsonb_build_object('items',(payload->'items')||'[{"productId":"ordinary","size":"42","quantity":1}]'),
 payload||'{"payment_method":"upon_receipt"}',
 jsonb_set(payload,'{items,0,quantity}','2'),
 jsonb_set(payload,'{items,0,specialRequestId}','99999999999999'),
 jsonb_set(payload,'{items,0,isSpecialOrder}','false')
 ] loop
  blocked:=false; begin perform public.store_create_order(customer,result,gen_random_uuid()); exception when others then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: checkout bypass %',result; end if;
 end loop;
 blocked:=false;begin perform public.store_create_order('99999999999999',payload,gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: ownership bypass'; end if;
 result:=public.store_create_order(customer,payload,key_id);oid:=(result->>'id')::bigint;
 if result->>'special_fulfillment'<>'true' or (result->>'total_price_usd')::numeric<>100 then raise exception 'TEST FAILED: version or authoritative quote'; end if;
 if not exists(select 1 from private.store_outbox e where e.event_key='special-order-status:'||oid||':Ожидает оплаты' and e.payload#>>'{special_order,amount}'='100.00' and e.payload#>>'{special_order,currency}'='USD') then raise exception 'TEST FAILED: initial payment prompt snapshot'; end if;
 if (public.store_create_order(customer,payload,key_id)->>'id')::bigint<>oid then raise exception 'TEST FAILED: idempotency'; end if;
 if (select status from public.china_requests where id=r1)<>'Оценён' then raise exception 'TEST FAILED: premature conversion'; end if;
 blocked:=false;begin perform public.store_admin_order_status(oid,'Заказан у поставщика');exception when others then blocked:=true;end;
 if not blocked or public.store_admin_confirm_payment(oid) then raise exception 'TEST FAILED: unpaid procurement'; end if;
 perform public.store_cancel_order(customer,oid,true);
 if (select reserved_order_id from public.china_requests where id=r1) is not null then raise exception 'TEST FAILED: draft release'; end if;
 if exists(select 1 from private.store_outbox e where e.payload#>>'{special_order,id}'=oid::text and sent_at is null) then raise exception 'TEST FAILED: abandoned draft notice not retired'; end if;
 result:=public.store_create_order(customer,payload,gen_random_uuid());oid:=(result->>'id')::bigint;
 update public.orders set reservation_expires_at=now()-interval '1 minute' where id=oid;
 perform private.store_expire_reservations(customer);
 if (select reserved_order_id from public.china_requests where id=r1) is not null or (select status from public.china_requests where id=r1)<>'Оценён' then raise exception 'TEST FAILED: expired draft blocks request'; end if;
 -- Retry after abandonment, submit receipt. Receipt is not payment confirmation.
 result:=public.store_create_order(customer,payload,gen_random_uuid());oid:=(result->>'id')::bigint;
 perform public.store_save_screenshot(customer,oid,'private:payment-screenshots/'||customer||'/fixture.png');
 if (select payment_status from public.orders where id=oid)<>'pending' or (select status from public.china_requests where id=r1)<>'Оценён' then raise exception 'TEST FAILED: receipt boundary'; end if;
 blocked:=false;begin perform public.store_admin_order_status(oid,'Заказан у поставщика');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: screenshot was treated as payment'; end if;
 update public.orders set reservation_expires_at=now()-interval '1 minute' where id=oid;
 perform private.store_expire_reservations(customer);
 if (select reserved_order_id from public.china_requests where id=r1) is distinct from oid or (select status from public.orders where id=oid)<>'Ожидает оплаты' then raise exception 'TEST FAILED: submitted receipt expired'; end if;
 if not public.store_admin_confirm_payment_with_notice(oid,null) then raise exception 'TEST FAILED: payment confirmation'; end if;
 if (select status from public.china_requests where id=r1)<>'Оформлен' or (select converted_to_order_id from public.china_requests where id=r1) is distinct from oid::text or (select status from public.orders where id=oid)<>'Принят' then raise exception 'TEST FAILED: accepted'; end if;
 if public.store_cancel_order(customer,oid,false) then raise exception 'TEST FAILED: customer automatically cancelled paid special'; end if;
 select id into waiting_event from private.store_outbox where event_key='special-order-status:'||oid||':Ожидает оплаты';
 select id into accepted_event from private.store_outbox where event_key='special-order-status:'||oid||':Принят';
 if public.store_claim_custom_notification(waiting_event) is not null then raise exception 'TEST FAILED: payment prompt sent after receipt'; end if;
 if public.store_claim_custom_notification(accepted_event) is null or public.store_claim_custom_notification(accepted_event) is not null then raise exception 'TEST FAILED: duplicate accepted notice claim'; end if;
 perform public.store_complete_notification(accepted_event);
 blocked:=false;begin perform public.store_admin_order_status(oid,'Получен');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: skipped fulfillment'; end if;
 foreach step in array array['Заказан у поставщика','В пути','Прибыл в страну','Собирается','Готов к выдаче','Получен'] loop
   perform public.store_admin_order_status(oid,step);
   perform public.store_admin_order_status(oid,step);
 end loop;
 if (select count(*) from private.store_outbox e where e.payload#>>'{special_order,id}'=oid::text)<>8 then raise exception 'TEST FAILED: pickup notices missing/duplicated'; end if;
 if exists(select 1 from private.store_outbox where order_id=oid and kind='order_client') then raise exception 'TEST FAILED: ordinary client message for special order'; end if;
 blocked:=false;begin perform public.store_admin_cancel_order(oid);exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: received order auto cancellation'; end if;
 blocked:=false;begin perform public.store_create_order(customer,payload,gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: duplicate completed special'; end if;
 -- Separate delivery chain, exact delivery charge and currency totals.
 payload:=payload||jsonb_build_object('delivery_method','delivery','delivery_address','Fixture address 15','order_currency','UZS','expected_total_usd',52,'expected_total_uzs',624000,'items',jsonb_build_array(other));
 result:=public.store_create_order(customer,payload,gen_random_uuid());did:=(result->>'id')::bigint;
 if (result->>'total_price_uzs')::numeric<>624000 then raise exception 'TEST FAILED: currency/delivery total'; end if;
 perform public.store_save_screenshot(customer,did,'private:payment-screenshots/'||customer||'/delivery.png');
 perform public.store_admin_confirm_payment(did);
 foreach step in array array['Заказан у поставщика','В пути','Прибыл в страну','Собирается','Упакован'] loop perform public.store_admin_order_status(did,step); end loop;
 blocked:=false;begin perform public.store_admin_order_status(did,'Получен');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: wrong delivery branch'; end if;
 blocked:=false;begin perform public.store_admin_order_status(did,'Передан курьеру','javascript:alert(1)');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: malicious courier URL'; end if;
 perform public.store_admin_order_status(did,'Передан курьеру','https://example.com/track?order=1&name=test');
 if (select courier_link from public.orders where id=did) is null then raise exception 'TEST FAILED: courier link'; end if;
 perform public.store_admin_order_status(did,'Доставлен');
 if (select status from public.orders where id=did)<>'Доставлен' then raise exception 'TEST FAILED: delivery completion'; end if;
 if (select count(*) from private.store_outbox e where e.payload#>>'{special_order,id}'=did::text)<>9 then raise exception 'TEST FAILED: delivery notice chain'; end if;
 -- Paid cancellation remains a manual refund, never a completed automatic refund.
 result:=public.store_create_request(customer,'{"product_name":"Cancellation fixture"}',gen_random_uuid());r3:=(result->>'id')::bigint;
 perform public.store_admin_request_status(r3,'Оценён','{"manager_price":50}');
 payload:=jsonb_set(payload,'{items,0,specialRequestId}',to_jsonb(r3));
 result:=public.store_create_order(customer,payload,gen_random_uuid());did:=(result->>'id')::bigint;
 perform public.store_save_screenshot(customer,did,'private:payment-screenshots/'||customer||'/cancel.png');
 perform public.store_admin_confirm_payment(did);
 perform public.store_admin_order_status(did,'Заказан у поставщика');
 blocked:=false;begin perform public.store_admin_cancel_order_reason(did,'Manual review');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: procurement cancellation requires manager review'; end if;
 perform public.store_admin_cancel_order_reason(did,'Supplier cancellation agreed manually',true);
 if (select payment_status from public.orders where id=did)<>'refund_pending' then raise exception 'TEST FAILED: refund state'; end if;
 -- Historical mixed orders are never reshaped and keep the previous status machine.
 insert into public.orders(user_id,client_name,client_phone,delivery_method,payment_method,total_price_usd,items,status,payment_status)
 values(customer,'Legacy fixture','+998901234567','pickup','upon_receipt',150,jsonb_build_array(other,other),'Активный','pending') returning id into historical;
 perform public.store_admin_order_status(historical,'В обработке');
 if (select jsonb_array_length(items) from public.orders where id=historical)<>2 or (select special_fulfillment from public.orders where id=historical) then raise exception 'TEST FAILED: legacy data rewritten'; end if;
 perform set_config('request.jwt.claims',((current_setting('request.jwt.claims')::jsonb)||'{"aal":"aal1"}')::text,true);
 blocked:=false;begin perform public.store_admin_order_status(did,'Доставлен');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: MFA bypass'; end if;
end $$;
select 'special fulfillment: isolated checkout, prepayment, reservations, receipt/confirmation boundary, pickup/delivery chains, transition guards, dedupe, legacy compatibility and MFA passed' result;
