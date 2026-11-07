-- Run inside BEGIN ... ROLLBACK; fixtures and notices must never commit.
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

  for i in 1..5 loop
    insert into public.orders(user_id,client_name,client_phone,delivery_method,payment_method,order_currency,total_price_usd,total_price_uzs,status,payment_status,items)
      values('900000799','Transaction-only courier fixture','+998901234567','delivery','upon_receipt','UZS',1,12000,'Готов','pending','[]') returning id into oid;
    if i<=3 then
      result:=public.store_admin_order_status(oid,'Выдан',case i when 1 then null when 2 then '   ' else 'https://example.invalid/courier' end);
      if result->>'status'<>'Выдан' or result->>'payment_status'<>'paid' then raise exception 'TEST FAILED: optional tracking/payment'; end if;
      if i<=2 and result->>'courier_link' is not null then raise exception 'TEST FAILED: empty tracking persisted'; end if;
      if i=3 and result->>'courier_link'<>'https://example.invalid/courier' then raise exception 'TEST FAILED: tracking lost'; end if;
    else
      blocked:=false;
      begin perform public.store_admin_order_status(oid,'Выдан',case i when 4 then 'javascript:alert(1)' else 'https://example.invalid/'||repeat('x',2000) end); exception when others then blocked:=true; end;
      if not blocked or (select status from public.orders where id=oid)<>'Готов' then raise exception 'TEST FAILED: invalid URL accepted or partial write'; end if;
    end if;
  end loop;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  blocked:=false;
  begin perform public.store_admin_order_status(oid,'Выдан'); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'TEST FAILED: authorization bypass'; end if;
end $$;
