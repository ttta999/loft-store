-- Additive preparation. Enforcement is enabled only after the MFA login has deployed.
alter table private.store_admins add column if not exists mfa_required boolean not null default false;

create or replace function public.store_admin_auth_state()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('isAdmin',true,'mfaRequired',a.mfa_required)
    from private.store_admins a where a.user_id=(select auth.uid())
      and exists(select 1 from auth.sessions s where s.id::text=(select auth.jwt())->>'session_id'
        and s.user_id=a.user_id and (s.not_after is null or s.not_after>now()))),
    jsonb_build_object('isAdmin',false,'mfaRequired',false));
$$;
revoke all on function public.store_admin_auth_state() from public,anon;
grant execute on function public.store_admin_auth_state() to authenticated;

create table if not exists private.store_payment_reviews(
  order_id bigint primary key references public.orders(id),
  reason text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
alter table private.store_payment_reviews enable row level security;
revoke all on private.store_payment_reviews from public,anon,authenticated;
grant select on private.store_payment_reviews to service_role;
insert into private.store_payment_reviews(order_id,reason,snapshot)
select id,'legacy_paid_without_confirmation',jsonb_build_object(
  'payment_status',payment_status,'paid_at',paid_at,'payment_method',payment_method,
  'status',status,'total_price_usd',total_price_usd,'total_price_uzs',total_price_uzs)
from public.orders where payment_method='upon_receipt' and payment_status='paid' and paid_at is null
on conflict(order_id) do nothing;

create table if not exists private.store_payment_audit(
  id bigint generated always as identity primary key,
  order_id bigint not null,
  happened_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  previous_state jsonb,
  current_state jsonb not null
);
alter table private.store_payment_audit enable row level security;
revoke all on private.store_payment_audit from public,anon,authenticated;
grant select on private.store_payment_audit to service_role;

create or replace function private.store_audit_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb; next_state jsonb;
begin
  next_state:=jsonb_build_object('payment_status',new.payment_status,'paid_at',new.paid_at,
    'payment_method',new.payment_method,'payment_provider',new.payment_provider,
    'total_price_usd',new.total_price_usd,'total_price_uzs',new.total_price_uzs,'status',new.status);
  if tg_op='UPDATE' then
    previous:=jsonb_build_object('payment_status',old.payment_status,'paid_at',old.paid_at,
      'payment_method',old.payment_method,'payment_provider',old.payment_provider,
      'total_price_usd',old.total_price_usd,'total_price_uzs',old.total_price_uzs,'status',old.status);
    if previous=next_state then return new; end if;
  end if;
  insert into private.store_payment_audit(order_id,actor_id,previous_state,current_state)
    values(new.id,auth.uid(),previous,next_state);
  return new;
end $$;
revoke all on function private.store_audit_payment() from public,anon,authenticated,service_role;
drop trigger if exists store_payment_audit on public.orders;
create trigger store_payment_audit after insert or update on public.orders
for each row execute function private.store_audit_payment();

create or replace function public.store_payment_review_report()
returns table(order_id bigint,reason text,snapshot jsonb,reviewed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.store_is_admin() then raise insufficient_privilege; end if;
  return query select r.order_id,r.reason,r.snapshot,r.reviewed_at from private.store_payment_reviews r order by r.order_id;
end $$;
revoke all on function public.store_payment_review_report() from public,anon;
grant execute on function public.store_payment_review_report() to authenticated;
