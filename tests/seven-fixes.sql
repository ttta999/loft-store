-- Transactional fixtures only. Run inside BEGIN/ROLLBACK.
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
declare u text:=(800000000000000+floor(random()*100000000000000))::bigint::text; id1 bigint; id2 bigint; rid bigint; payload jsonb; blocked boolean; step text;
begin
 update public.settings set value='{"rate":11963.85}' where key='exchange_rate';
 payload:=public.store_create_request(u,'{"product_name":"Rate fixture"}',gen_random_uuid());rid:=(payload->>'id')::bigint;
 perform public.store_admin_request_status(rid,'Оценён','{"manager_price":270,"manager_comment":"Fixture"}');
 select e.payload->'special_request' into payload from private.store_outbox e where event_key='special-status:'||rid||':Оценён';
 if payload->>'manager_price'<>'270' or (payload->>'amount_uzs')::numeric<>3230240 or (payload->>'exchange_rate')::numeric<>11963.85 then raise exception 'TEST FAILED: authoritative quote UZS snapshot %',payload; end if;
 perform public.store_admin_request_status(rid,'Оценён','{"manager_price":270,"manager_comment":"Fixture"}');
 if (select count(*) from private.store_outbox where event_key='special-status:'||rid||':Оценён')<>1 then raise exception 'TEST FAILED: quote retry duplication'; end if;
 -- Paid ordinary delivery skips only packed. Other shortcuts and unpaid handoff stay blocked.
 insert into public.orders(user_id,client_name,client_phone,items,total_price_usd,total_price_uzs,order_currency,exchange_rate_at_order,delivery_method,payment_method,status,payment_status,paid_at)
 values(u,'Fixture','+998901234567','[]',100,1196385,'USD',11963.85,'delivery','online_card','Активный','paid',now()) returning id into id1;
 blocked:=false;begin perform public.store_admin_order_status(id1,'Выдан');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: skipped assembly'; end if;
 perform public.store_admin_order_status(id1,'В обработке');
 blocked:=false;begin perform public.store_admin_order_status(id1,'Готов');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: new packed delivery'; end if;
 blocked:=false;begin perform public.store_admin_order_status(id1,'Выдан','javascript:alert(1)');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: invalid courier tracking'; end if;
 perform public.store_admin_order_status(id1,'Выдан');perform public.store_admin_order_status(id1,'Доставлен');
 if exists(select 1 from private.store_outbox e where order_id=id1 and e.payload#>>'{ordinary_order,stage}'='Упакован') then raise exception 'TEST FAILED: packed notification'; end if;
 -- Legacy packed ordinary delivery is not rewritten but may continue.
 insert into public.orders(user_id,client_name,client_phone,items,total_price_usd,order_currency,delivery_method,payment_method,status,payment_status,paid_at)
 values(u,'Legacy fixture','+998901234567','[]',100,'USD','delivery','online_card','Готов','paid',now()) returning id into id2;
 perform public.store_admin_order_status(id2,'Выдан','https://example.test/track');
 update public.orders set status='Упакован' where id=id2;
 perform public.store_admin_order_status(id2,'Выдан');
 -- New special delivery retains all international stages and the full payment boundary.
 insert into public.orders(user_id,client_name,client_phone,items,total_price_usd,order_currency,delivery_method,payment_method,status,payment_status,paid_at,special_fulfillment,special_order_id)
 values(u,'Special fixture','+998901234567','[{"isSpecialOrder":true,"quantity":1}]',100,'USD','delivery','online_card','Принят','paid',now(),true,rid::text) returning id into id1;
 foreach step in array array['Заказан у поставщика','В пути','Прибыл в страну','Собирается'] loop perform public.store_admin_order_status(id1,step);end loop;
 blocked:=false;begin perform public.store_admin_order_status(id1,'Упакован');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: new packed special'; end if;
 perform public.store_admin_order_status(id1,'Передан курьеру');perform public.store_admin_order_status(id1,'Доставлен');
 if exists(select 1 from private.store_outbox e where order_id=id1 and e.payload#>>'{special_order,status}'='Упакован') then raise exception 'TEST FAILED: packed special notification'; end if;
 insert into public.orders(user_id,client_name,client_phone,items,total_price_usd,order_currency,delivery_method,payment_method,status,payment_status,paid_at,special_fulfillment,special_order_id)
 values(u,'Legacy special','+998901234567','[{"isSpecialOrder":true,"quantity":1}]',100,'USD','delivery','online_card','Упакован','paid',now(),true,rid::text) returning id into id2;
 perform public.store_admin_order_status(id2,'Передан курьеру','https://example.test/track');
 insert into public.orders(user_id,client_name,client_phone,items,total_price_usd,order_currency,delivery_method,payment_method,status,payment_status)
 values(u,'Unpaid','+998901234567','[]',100,'USD','delivery','online_card','В обработке','pending') returning id into id2;
 blocked:=false;begin perform public.store_admin_order_status(id2,'Выдан');exception when others then blocked:=true;end;
 if not blocked then raise exception 'TEST FAILED: unpaid delivery'; end if;
end $$;
select 'Quote UZS snapshot, idempotency, direct courier handoff, legacy packed compatibility and strict payment/stage guards passed' result;
