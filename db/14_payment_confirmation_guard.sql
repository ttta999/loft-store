-- Keep historical rows unchanged, but prevent new confirmations without a recorded timestamp.
create or replace function private.store_guard_payment_confirmation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.payment_status='paid' and new.paid_at is null then
    if tg_op='INSERT' then raise exception 'Payment confirmation required'; end if;
    if old.payment_status is distinct from new.payment_status or old.paid_at is distinct from new.paid_at then
      raise exception 'Payment confirmation required';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.store_guard_payment_confirmation() from public,anon,authenticated,service_role;
drop trigger if exists store_payment_confirmation_guard on public.orders;
create trigger store_payment_confirmation_guard before insert or update of payment_status,paid_at on public.orders
for each row execute function private.store_guard_payment_confirmation();
