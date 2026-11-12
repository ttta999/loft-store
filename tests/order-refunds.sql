-- Run inside BEGIN / ROLLBACK, after the new migration. Never commit fixtures.
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
declare u text:=(800000000000000+floor(random()*100000000000000))::bigint::text;
 o public.orders%rowtype; r public.refunds%rowtype; draftid bigint; paidid bigint; lateid bigint; cashid bigint; deliveryid bigint;
 key1 uuid:=gen_random_uuid(); replay uuid:=gen_random_uuid(); blocked boolean; x jsonb; oldpaid timestamptz;
 pid uuid; cid uuid; vid uuid; checkout jsonb; neworder bigint; ev1 bigint; ev2 bigint;
 admin1 uuid:=auth.uid(); admin2 uuid:=gen_random_uuid(); sess2 uuid:=gen_random_uuid(); jwt1 text:=current_setting('request.jwt.claims'); path text;
begin
 insert into public.orders(user_id,user_chat_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status)
 values(u,u,'Rollback fixture','+998901234567','[]',100,1200000,'USD',12000,'pickup','online_card','Ожидает оплаты','pending') returning id into draftid;
 perform private.store_queue_order_notifications(draftid);
 if exists(select 1 from private.store_outbox where order_id=draftid) then raise exception 'TEST FAILED: normal draft notification'; end if;
 if public.store_admin_confirm_payment(draftid) then raise exception 'TEST FAILED: paid without receipt'; end if;
 perform public.store_cancel_order(u,draftid,true);
 if exists(select 1 from public.refunds where order_id=draftid) or (select cancelled_by from public.orders where id=draftid)<>'system' then raise exception 'TEST FAILED: draft refund/source'; end if;
 -- An abandoned checkout may receive money much later; manager explicitly opens a check.
 x:=public.store_admin_open_refund(draftid,'Late transfer reported');
 if (x->>'status')<>'Проверка платежа' or not exists(select 1 from jsonb_array_elements(public.store_admin_refunds()) e where (e->>'order_id')::bigint=draftid) then raise exception 'TEST FAILED: hidden draft payment review'; end if;
 insert into public.orders(user_id,user_chat_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status)
 values(u,u,'Cash','+998901234567','[]',100,1200000,'UZS',12000,'pickup','upon_receipt','Активный','pending') returning id into cashid;
 blocked:=false;begin perform public.store_admin_order_status(cashid,'Готов');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: cash skip'; end if;
 perform public.store_admin_order_status(cashid,'В обработке');
 if public.store_cancel_order(u,cashid,false) then raise exception 'TEST FAILED: late client cancel'; end if;
 perform public.store_admin_order_status(cashid,'Готов');
 if (select payment_status from public.orders where id=cashid)<>'pending' then raise exception 'TEST FAILED: premature cash payment'; end if;
 perform public.store_admin_order_status(cashid,'Выдан');
 select * into o from public.orders where id=cashid;
 if o.payment_status<>'paid' or o.paid_at is null or o.payment_amount<>1200000 or o.payment_currency<>'UZS' then raise exception 'TEST FAILED: cash collection'; end if;
 if public.store_cancel_order(u,cashid,false) then raise exception 'TEST FAILED: received cash canceled'; end if;
 insert into public.orders(user_id,user_chat_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status)
 values(u,u,'Prepaid','+998901234567','[]',100,1200000,'USD',12000,'pickup','online_card','Ожидает оплаты','pending') returning id into paidid;
 if not public.store_save_screenshot(u,paidid,'private:payment-screenshots/'||u||'/fixture.png') then raise exception 'TEST FAILED: receipt'; end if;
 update public.orders set reservation_expires_at=now()-interval '1 minute' where id=paidid;
 perform private.store_expire_reservations(u);
 if (select status from public.orders where id=paidid)<>'Ожидает оплаты' then raise exception 'TEST FAILED: receipt auto-expired'; end if;
 blocked:=false;begin perform public.store_admin_order_status(paidid,'В обработке');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: unpaid preparation'; end if;
 if not public.store_admin_confirm_payment_with_notice(paidid,null) then raise exception 'TEST FAILED: manual confirmation'; end if;
 if not public.store_admin_confirm_payment_with_notice(paidid,null) then raise exception 'TEST FAILED: payment retry'; end if;
 if (select count(*) from private.store_outbox where order_id=paidid and payload#>>'{ordinary_order,stage}'='Принят')<>1 then raise exception 'TEST FAILED: duplicated accepted'; end if;
 select paid_at into oldpaid from public.orders where id=paidid;
 if public.store_cancel_order('other',paidid,false) then raise exception 'TEST FAILED: ownership'; end if;
 if not public.store_cancel_order(u,paidid,false) or not public.store_cancel_order(u,paidid,false) then raise exception 'TEST FAILED: paid client cancel retry'; end if;
 select * into r from public.refunds where order_id=paidid;
 if r.status<>'Ожидает возврата' or r.amount<>100 or r.currency<>'USD' or r.cancelled_by<>'client' then raise exception 'TEST FAILED: atomic paid refund'; end if;
 if (select count(*) from public.refunds where order_id=paidid)<>1 or (select count(*) from private.store_outbox where event_key='order-cancelled:'||paidid)<>1 then raise exception 'TEST FAILED: duplicate cancellation/refund'; end if;
 x:=public.store_admin_refund_action(r.id,'claim',key1);
 perform public.store_admin_refund_action(r.id,'claim',key1);
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'complete',gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: proof missing'; end if;
 -- A second real MFA session must not take over or complete the first manager's work.
 insert into private.store_registration_invites values(encode(extensions.digest(admin2::text||'@fixture.invalid','sha256'),'hex'),now()+interval '1 hour');
 insert into auth.users(id,aud,role,email,created_at,updated_at) values(admin2,'authenticated','authenticated',admin2::text||'@fixture.invalid',now(),now());
 insert into private.store_admins(user_id,mfa_required) values(admin2,true);
 insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(sess2,admin2,now(),now(),'aal2');
 insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at) values(gen_random_uuid(),admin2,'Fixture','totp','verified',now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin2,'session_id',sess2,'role','authenticated','aal','aal2')::text,true);
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'claim',gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: claim takeover'; end if;
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'complete',gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: other manager complete'; end if;
 perform set_config('request.jwt.claims',jwt1,true);
 path:=r.id||'/'||admin1||'/'||gen_random_uuid()||'.pdf';
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'proof',gen_random_uuid(),null,null,null,'private:refund-proofs/'||path);exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: forged file'; end if;
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('refund-proofs',path,admin1::text,'{"size":128,"mimetype":"application/pdf"}');
 perform public.store_admin_refund_action(r.id,'proof',gen_random_uuid(),null,null,null,'private:refund-proofs/'||path);
 perform public.store_admin_refund_action(r.id,'complete',replay);
 perform public.store_admin_refund_action(r.id,'complete',replay);
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'complete',gen_random_uuid());exception when others then blocked:=true;end;
 if not blocked or (select paid_at from public.orders where id=paidid) is distinct from oldpaid then raise exception 'TEST FAILED: duplicate refund/payment history'; end if;
 if (select payment_status from public.orders where id=paidid)<>'refunded' then raise exception 'TEST FAILED: completed refund payment'; end if;
 insert into public.orders(user_id,user_chat_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status,receipt_submitted_at,payment_screenshot_url)
 values(u,u,'Review','+998901234567','[]',100,1200000,'UZS',12000,'delivery','online_card','Ожидает оплаты','pending',now(),'private:payment-screenshots/'||u||'/review.png') returning id into lateid;
 blocked:=false;begin perform public.store_admin_cancel_order_reason(lateid,' ');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: required reason'; end if;
 perform public.store_admin_cancel_order_reason(lateid,'Cannot fulfill');
 select * into r from public.refunds where order_id=lateid;
 if r.status<>'Проверка платежа' or r.amount is not null or r.currency is not null then raise exception 'TEST FAILED: assumed funds'; end if;
 perform public.store_admin_refund_action(r.id,'claim',gen_random_uuid());
 perform public.store_admin_refund_action(r.id,'no_payment',gen_random_uuid(),null,null,'Checked bank');
 perform public.store_admin_refund_action(r.id,'claim',gen_random_uuid());
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'payment_received',gen_random_uuid(),1200000,'UZS');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: reopening without reason'; end if;
 key1:=gen_random_uuid();
 perform public.store_admin_refund_action(r.id,'payment_received',key1,1200000,'UZS','Payment arrived later');
 perform public.store_admin_refund_action(r.id,'payment_received',key1,1200000,'UZS','Payment arrived later');
 blocked:=false;begin perform public.store_admin_refund_action(r.id,'payment_received',key1,1200001,'UZS','Payment arrived later');exception when others then blocked:=true;end;
 if not blocked or (select status from public.orders where id=lateid)<>'Отменён' or (select amount from public.refunds where id=r.id)<>1200000 then raise exception 'TEST FAILED: late payment reactivation/replay'; end if;
 if public.store_admin_confirm_payment(lateid) then raise exception 'TEST FAILED: cancelled payment accepted'; end if;
 insert into public.orders(user_id,user_chat_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status,paid_at)
 values(u,u,'Delivery','+998901234567','[]',100,1200000,'USD',12000,'delivery','online_card','Активный','paid',now()) returning id into deliveryid;
 perform public.store_admin_order_status(deliveryid,'В обработке');perform public.store_admin_order_status(deliveryid,'Выдан');
 blocked:=false;begin perform public.store_admin_cancel_order_reason(deliveryid,'Courier agreed');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: courier manual review'; end if;
 perform public.store_admin_cancel_order_reason(deliveryid,'Courier agreed',true);
 -- Cancellation and refund-result snapshots must be claimed in order, including retry leases.
 select id into ev1 from private.store_outbox where event_key='order-cancelled:'||lateid;
 select min(id) into ev2 from private.store_outbox where order_id=lateid and payload->'refund' is not null;
 if public.store_claim_custom_notification(ev2) is not null then raise exception 'TEST FAILED: financial notice overtook cancellation'; end if;
 if public.store_claim_custom_notification(ev1) is null or public.store_claim_custom_notification(ev1) is not null then raise exception 'TEST FAILED: duplicate cancel delivery claim'; end if;
 perform public.store_complete_notification(ev1);
 if public.store_claim_custom_notification(ev2) is null then raise exception 'TEST FAILED: refund result blocked'; end if;
 -- Stock restoration after a real checkout must happen exactly once.
 insert into public.categories(id,name_ru,name_uz,is_active) values('shoes','Обувь','Poyabzal',true) on conflict(id) do nothing;
 insert into public.subcategories(id,category_id,name_ru,name_uz,size_type,sizes,is_active) values('refund-fixture-'||admin1,'shoes','Fixture','Fixture','numeric','["42"]',true);
 pid:=public.store_admin_save_product(null,jsonb_build_object('name_ru','Refund fixture','name_uz','Refund fixture','category','shoes','subcategory','refund-fixture-'||admin1,'price_usd',20,'images','[]'::jsonb,'size_type','numeric'),'[{"key":"new","name_ru":"Синий","images":[]}]','[{"color_key":"new","size_value":"42","stock":3}]',null);
 select id into cid from public.product_colors where product_id=pid;
 select id into vid from public.product_variants where product_id=pid;
 checkout:=jsonb_build_object('client_name','Stock fixture','client_phone','+998901234567','delivery_method','pickup','payment_method','upon_receipt','order_currency','USD','expected_total_usd',20,'items',jsonb_build_array(jsonb_build_object('productId',pid,'colorId',cid,'size','42','quantity',1)));
 x:=public.store_create_order(u,checkout,gen_random_uuid());neworder:=(x->>'id')::bigint;
 if (select stock from public.product_variants where id=vid)<>2 then raise exception 'TEST FAILED: stock reservation'; end if;
 perform public.store_cancel_order(u,neworder,false);perform public.store_cancel_order(u,neworder,false);
 perform set_config('loft.refund.user',u,true);perform set_config('loft.refund.checkout',(checkout||'{"payment_method":"online_card"}')::text,true);
 if (select stock from public.product_variants where id=vid)<>3 or exists(select 1 from public.refunds where order_id=neworder) then raise exception 'TEST FAILED: cash stock released twice/refund created'; end if;

end $$;
-- Exercise the actual backend role, including private helper/audit sequence privileges.
set local role service_role;
do $$ declare u text:=current_setting('loft.refund.user'); x jsonb; oid bigint; begin
 x:=public.store_create_order(u,current_setting('loft.refund.checkout')::jsonb,gen_random_uuid());oid:=(x->>'id')::bigint;
 if not public.store_save_screenshot(u,oid,'private:payment-screenshots/'||u||'/service.png') then raise exception 'TEST FAILED: service receipt'; end if;
 if not public.store_cancel_order(u,oid,false) then raise exception 'TEST FAILED: service cancellation'; end if;
 if not exists(select 1 from public.refunds where order_id=oid and status='Проверка платежа') then raise exception 'TEST FAILED: service refund audit'; end if;
end $$;
reset role;
-- Execute access checks as authenticated, not only as the database owner.
set local role authenticated;
do $$declare blocked boolean; begin
 if has_table_privilege(current_user,'public.refunds','UPDATE') or has_table_privilege(current_user,'public.refunds','INSERT') then raise exception 'TEST FAILED: direct financial writes'; end if;
 if has_function_privilege('anon','public.store_admin_refund_action(bigint,text,uuid,numeric,text,text,text)','EXECUTE') then raise exception 'TEST FAILED: anonymous financial RPC'; end if;
 if jsonb_array_length(public.store_admin_refunds())<1 then raise exception 'TEST FAILED: MFA admin projection'; end if;
 perform set_config('request.jwt.claims',(current_setting('request.jwt.claims')::jsonb||'{"aal":"aal1"}')::text,true);
 blocked:=false;begin perform public.store_admin_refunds();exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: MFA financial bypass'; end if;
 if exists(select 1 from public.refunds) then raise exception 'TEST FAILED: non-MFA financial data'; end if;
 perform set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
 if exists(select 1 from public.refunds) then raise exception 'TEST FAILED: other customer financial access'; end if;
end $$;
reset role;
select 'Order/refund lifecycle, strict sequencing, cash collection, cancellation, receipt retention, persistent manager claim, replay guards, private proof, late payment, original payment preservation and MFA/RLS passed' as result;
