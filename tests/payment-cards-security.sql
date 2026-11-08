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
declare bad jsonb; blocked boolean; changed integer;
begin
  if not public.store_is_admin() then raise exception 'TEST FAILED: MFA fixture'; end if;
  update public.settings set value='{"UZS":{"number":"1111222233334444","holder":"Fixture UZS"},"USD":{"number":"4444333322221111","holder":"Fixture USD"}}' where key='payment_cards';
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'TEST FAILED: MFA admin cannot update cards'; end if;
  for bad in select value from jsonb_array_elements('[null,{}, {"UZS":{"number":"123","holder":"Fixture"},"USD":{"number":"4444333322221111","holder":"Fixture"}}, {"UZS":{"number":"1111222233334444","holder":""},"USD":{"number":"4444333322221111","holder":"Fixture"}}]'::jsonb) loop
    blocked:=false;
    begin update public.settings set value=bad where key='payment_cards'; exception when check_violation then blocked:=true; end;
    if not blocked then raise exception 'TEST FAILED: invalid recipient accepted'; end if;
  end loop;
  perform set_config('request.jwt.claims',((current_setting('request.jwt.claims')::jsonb)||'{"aal":"aal1"}')::text,true);
  if public.store_is_admin() then raise exception 'TEST FAILED: AAL1 is admin'; end if;
  update public.settings set value='{}' where key='payment_cards';
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'TEST FAILED: cards changed without MFA'; end if;
end $$;
reset role;
set local role anon;
do $$
declare changed integer; blocked boolean:=false;
begin
  if (select count(*) from public.settings where key='payment_cards')<>1 then raise exception 'TEST FAILED: public payment details unavailable'; end if;
  begin
    update public.settings set value='{}' where key='payment_cards';
    get diagnostics changed=row_count;
    blocked:=changed=0;
  exception when insufficient_privilege then blocked:=true;
  end;
  if not blocked then raise exception 'TEST FAILED: anonymous recipient write'; end if;
end $$;
reset role;
select 'payment cards: public read, MFA-only write, invalid-data rejection passed' as result;
