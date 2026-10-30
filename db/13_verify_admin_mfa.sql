begin;
do $$
declare session_id uuid:=gen_random_uuid(); factor_id uuid:=gen_random_uuid();
  admin_id uuid:='157d5707-f831-4853-bc29-80e0d904a3da';
begin
  insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(session_id,admin_id,now(),now(),'aal1');
  perform set_config('loft_test.session_id',session_id::text,true);
  update private.store_admins set mfa_required=true where user_id=admin_id;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',session_id,'role','authenticated','aal','aal1')::text,true);
  if public.store_is_admin() then raise exception 'TEST FAILED: password alone granted admin'; end if;
  if not (public.store_admin_auth_state()->>'isAdmin')::boolean then raise exception 'TEST FAILED: enrollment inaccessible'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',session_id,'role','authenticated','aal','aal2')::text,true);
  if public.store_is_admin() then raise exception 'TEST FAILED: stale aal2 JWT accepted for aal1 session'; end if;
  update auth.sessions set aal='aal2' where id=session_id;
  if public.store_is_admin() then raise exception 'TEST FAILED: missing verified factor accepted'; end if;
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at)
    values(factor_id,admin_id,'Transaction-only security fixture','totp','verified',now(),now());
  if not public.store_is_admin() then raise exception 'TEST FAILED: verified MFA session rejected'; end if;
end $$;
set local role authenticated;
do $$ begin
  if not public.store_is_admin() then raise exception 'TEST FAILED: MFA RLS gate'; end if;
  perform count(*) from public.orders;
  perform public.store_payment_review_report();
end $$;
reset role;
do $$ begin
  update auth.sessions set aal='aal1' where id=current_setting('loft_test.session_id')::uuid;
end $$;
set local role authenticated;
do $$ begin
  if public.store_is_admin() or exists(select 1 from public.orders) then raise exception 'TEST FAILED: downgraded session retained access'; end if;
  begin perform public.store_admin_confirm_payment(0); raise exception 'TEST FAILED: payment bypass'; exception when insufficient_privilege then null; end;
  begin perform public.store_admin_cancel_order(0); raise exception 'TEST FAILED: cancel bypass'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  delete from auth.sessions where id=current_setting('loft_test.session_id')::uuid;
  if public.store_is_admin() or (public.store_admin_auth_state()->>'isAdmin')::boolean then raise exception 'TEST FAILED: revoked session retained access'; end if;
  if has_function_privilege('anon','public.store_admin_auth_state()','execute') then raise exception 'TEST FAILED: anonymous auth state access'; end if;
end $$;
select 'admin MFA, active session and RLS checks passed' as result;
rollback;
