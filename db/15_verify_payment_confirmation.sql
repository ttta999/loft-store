begin;
do $$
declare fixture_order_id bigint;
begin
  insert into public.orders(user_id,client_name,client_phone,delivery_method,payment_method,total_price_usd,items,payment_status)
    values('900000205','Payment fixture','+998901234567','pickup','upon_receipt',20,'[]','pending') returning id into fixture_order_id;
  begin
    update public.orders set payment_status='paid' where id=fixture_order_id;
    raise exception 'TEST FAILED: payment accepted without confirmation time';
  exception when others then if sqlerrm<>'Payment confirmation required' then raise; end if; end;
  update public.orders set payment_status='paid',paid_at=now() where id=fixture_order_id;
  if not exists(select 1 from private.store_payment_audit a where a.order_id=fixture_order_id and a.current_state->>'payment_status'='paid') then raise exception 'TEST FAILED: confirmation missing from audit'; end if;
  begin
    insert into public.orders(user_id,client_name,client_phone,delivery_method,payment_method,total_price_usd,items,payment_status)
      values('900000205','Payment fixture','+998901234567','pickup','upon_receipt',20,'[]','paid');
    raise exception 'TEST FAILED: new legacy-style paid row accepted';
  exception when others then if sqlerrm<>'Payment confirmation required' then raise; end if; end;
end $$;
select 'payment confirmation guard and audit checks passed' as result;
rollback;
