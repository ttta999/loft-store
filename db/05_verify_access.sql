-- Assertions run in a rolled-back transaction; no customer data is returned.
begin;
set local role anon;
do $$ begin
  if has_table_privilege('anon','public.orders','select') or has_table_privilege('anon','public.china_requests','select')
    or has_table_privilege('anon','public.subscribers','select') then raise exception 'SECURITY TEST FAILED: anonymous personal-data grants'; end if;
  if has_table_privilege('anon','public.products','update') or has_table_privilege('anon','public.settings','update')
    then raise exception 'SECURITY TEST FAILED: anonymous catalog writes'; end if;
  if not has_table_privilege('anon','public.products','select') then raise exception 'SECURITY TEST FAILED: catalog unavailable'; end if;
  if has_function_privilege('anon','public.delete_unpaid_order(bigint)','execute')
    or has_function_privilege('anon','public.store_create_order(text,jsonb,uuid)','execute')
    then raise exception 'SECURITY TEST FAILED: anonymous privileged RPC'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare n integer; begin
  if public.store_is_admin() then raise exception 'SECURITY TEST FAILED: outsider admin'; end if;
  if exists(select 1 from public.orders) or exists(select 1 from public.china_requests) or exists(select 1 from public.subscribers) then raise exception 'SECURITY TEST FAILED: outsider sees personal data'; end if;
  update public.products set price_usd=price_usd;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'SECURITY TEST FAILED: outsider changes products'; end if;
  begin perform public.store_admin_cancel_order(0); raise exception 'SECURITY TEST FAILED: outsider cancels'; exception when insufficient_privilege then null; end;
  begin perform public.store_admin_confirm_payment(0); raise exception 'SECURITY TEST FAILED: outsider confirms payment'; exception when insufficient_privilege then null; end;
end $$;
-- A manager ID alone no longer grants access; the MFA-positive session matrix is in 13_verify_admin_mfa.sql.
select set_config('request.jwt.claims','{"sub":"157d5707-f831-4853-bc29-80e0d904a3da","role":"authenticated","aal":"aal1"}',true);
do $$ begin
  if public.store_is_admin() or exists(select 1 from public.orders) then raise exception 'SECURITY TEST FAILED: manager bypassed MFA'; end if;
end $$;
reset role;
do $$ begin
  if exists(select 1 from storage.buckets where id in ('payment-screenshots','china-requests') and public) then raise exception 'SECURITY TEST FAILED: public private files'; end if;
  if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and cmd<>'SELECT' and 'public'::name=any(roles)) then raise exception 'SECURITY TEST FAILED: public file writes'; end if;
end $$;
select 'access security checks passed' as result;
rollback;
