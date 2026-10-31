-- All identities and records below are transaction-only fixtures; no messages are sent.
begin;
do $$
declare admin_id uuid:=gen_random_uuid(); session_id uuid:=gen_random_uuid();
  product_id uuid:=gen_random_uuid(); variant_id uuid:=gen_random_uuid(); order_id bigint;
  result jsonb; payload jsonb;
begin
  insert into auth.users(id,aud,role,email,created_at,updated_at)
    values(admin_id,'authenticated','authenticated',admin_id::text||'@fixture.invalid',now(),now());
  insert into private.store_admins(user_id,mfa_required) values(admin_id,true);
  insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(session_id,admin_id,now(),now(),'aal2');
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at)
    values(gen_random_uuid(),admin_id,'Transaction-only lifecycle fixture','totp','verified',now(),now());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',session_id,'role','authenticated','aal','aal2')::text,true);
  insert into public.categories(id,name_ru,name_uz) values('shoes','Обувь','Shoes') on conflict do nothing;
  update public.categories set is_active=true where id='shoes';
  insert into public.settings(key,value) values('exchange_rate','{"rate":12000}'),('sale_mode_enabled','{"enabled":false}')
    on conflict(key) do update set value=excluded.value;
  insert into public.products(id,name_ru,name_uz,category,price_usd,images,size_type,is_active)
    values(product_id,'Manager fixture','Manager fixture','shoes',20,array[]::text[],'numeric',true);
  insert into public.product_variants(id,product_id,size_value,stock) values(variant_id,product_id,'42',2);
  payload:=jsonb_build_object('client_name','Manager lifecycle fixture','client_phone','+998901234567',
    'delivery_method','pickup','payment_method','online_card','order_currency','UZS','expected_total_usd',20,'expected_total_uzs',240000,
    'items',jsonb_build_array(jsonb_build_object('productId',product_id,'size','42','quantity',1)));
  result:=public.store_create_order('900000401',payload,gen_random_uuid());
  order_id:=(result->>'id')::bigint;
  if (select stock from public.product_variants where id=variant_id)<>1 then raise exception 'TEST FAILED: order did not reserve stock'; end if;
  if not public.store_admin_confirm_payment(order_id) or not public.store_admin_confirm_payment(order_id) then raise exception 'TEST FAILED: payment confirmation/idempotency'; end if;
  if not exists(select 1 from public.orders o where o.id=order_id and payment_status='paid' and paid_at is not null) then raise exception 'TEST FAILED: payment state'; end if;
  result:=public.store_admin_cancel_order(order_id);
  if result->>'payment_status'<>'refund_pending' or result->>'status'<>'Отменён' then raise exception 'TEST FAILED: paid cancellation/refund state'; end if;
  perform public.store_admin_cancel_order(order_id);
  if (select stock from public.product_variants where id=variant_id)<>2 then raise exception 'TEST FAILED: cancellation returned stock incorrectly'; end if;
  if public.store_admin_confirm_payment(order_id) then raise exception 'TEST FAILED: cancelled order reactivated'; end if;
end $$;
select 'manager payment, cancellation, refund state and stock idempotency checks passed' as result;
rollback;
