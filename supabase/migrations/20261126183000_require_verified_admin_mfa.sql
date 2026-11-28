-- Apply only after verifying a fresh AAL2 login for each existing administrator.
begin;
lock table private.store_admins in share row exclusive mode;

do $$
begin
  if exists (
    select 1 from private.store_admins a
    left join auth.users u on u.id = a.user_id
    where not a.mfa_required or u.email_confirmed_at is null
      or 1 <> (select count(*) from auth.mfa_factors f
        where f.user_id = a.user_id and f.status = 'verified' and f.factor_type = 'totp')
  ) then
    raise exception 'Every existing admin must have mandatory MFA and exactly one verified TOTP factor';
  end if;
end;
$$;

alter table private.store_admins
  add column approved_factor_id uuid references auth.mfa_factors(id) on delete set null,
  alter column mfa_required set default true;
update private.store_admins a set approved_factor_id = (
  select f.id from auth.mfa_factors f
  where f.user_id = a.user_id and f.status = 'verified' and f.factor_type = 'totp'
);
do $$
begin
  if exists(select 1 from private.store_admins where approved_factor_id is null) then
    raise exception 'An existing factor changed during migration';
  end if;
end;
$$;
alter table private.store_admins add constraint store_admin_mfa_mandatory check (mfa_required);
revoke insert, update, delete on private.store_admins from public, anon, authenticated, service_role;

create or replace function public.store_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from private.store_admins a
    join auth.users u on u.id = a.user_id and u.email_confirmed_at is not null
    join auth.sessions s on s.user_id = a.user_id and s.id::text = (select auth.jwt())->>'session_id'
    join auth.mfa_factors f on f.id = a.approved_factor_id and f.user_id = a.user_id
      and f.factor_type = 'totp' and f.status = 'verified'
    where a.user_id = (select auth.uid())
      and (select auth.jwt())->>'aal' = 'aal2' and s.aal = 'aal2' and s.factor_id = f.id
      and (s.not_after is null or s.not_after > now())
  );
$$;

create or replace function public.store_admin_auth_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('isAdmin', true, 'mfaRequired', true, 'factorId', f.id)
    from private.store_admins a
    join auth.users u on u.id = a.user_id and u.email_confirmed_at is not null
    join auth.sessions s on s.user_id = a.user_id and s.id::text = (select auth.jwt())->>'session_id'
    join auth.mfa_factors f on f.id = a.approved_factor_id and f.user_id = a.user_id
      and f.factor_type = 'totp' and f.status = 'verified'
    where a.user_id = (select auth.uid()) and (s.not_after is null or s.not_after > now())
  ), jsonb_build_object('isAdmin', false, 'mfaRequired', false));
$$;
revoke all on function public.store_is_admin(), public.store_admin_auth_state() from public, anon;
grant execute on function public.store_is_admin(), public.store_admin_auth_state() to authenticated;

create table private.store_admin_enrollment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  factor_id uuid not null references auth.mfa_factors(id) on delete cascade,
  expires_at timestamptz not null
);
create table private.store_admin_access_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  factor_id uuid,
  event text not null check (event in ('approved', 'activated', 'recovery_started')),
  operator_role name not null default session_user,
  happened_at timestamptz not null default clock_timestamp()
);
alter table private.store_admin_enrollment enable row level security;
alter table private.store_admin_access_events enable row level security;
revoke all on private.store_admin_enrollment, private.store_admin_access_events from public, anon, authenticated, service_role;

-- Owner workflow after independent identity verification and supervised Auth enrollment.
-- No administration privileges are granted by enrollment in Auth alone.
create function private.store_approve_admin(p_user uuid, p_factor uuid) returns uuid
language plpgsql volatile security invoker set search_path = '' as $$
declare approval uuid;
begin
  perform 1 from auth.users where id = p_user and email_confirmed_at is not null for update;
  if not found or exists(select 1 from private.store_admins where user_id = p_user)
    or not exists (select 1 from auth.mfa_factors
      where id = p_factor and user_id = p_user and status = 'verified' and factor_type = 'totp') then
    raise exception 'Confirm the account and its exact TOTP factor before approval';
  end if;
  delete from private.store_admin_enrollment where user_id = p_user;
  insert into private.store_admin_enrollment(user_id,factor_id,expires_at)
    values(p_user,p_factor,clock_timestamp()+interval '15 minutes') returning id into approval;
  insert into private.store_admin_access_events(user_id,factor_id,event) values(p_user,p_factor,'approved');
  return approval;
end;
$$;

create function private.store_activate_admin(p_user uuid, p_approval uuid) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare approved_factor uuid;
begin
  perform 1 from auth.users where id = p_user and email_confirmed_at is not null for update;
  if not found then raise insufficient_privilege; end if;
  delete from private.store_admin_enrollment e
    where e.id = p_approval and e.user_id = p_user and e.expires_at > clock_timestamp()
      and exists (select 1 from auth.mfa_factors f where f.id = e.factor_id and f.user_id = p_user
        and f.status = 'verified' and f.factor_type = 'totp')
    returning e.factor_id into approved_factor;
  if not found then raise insufficient_privilege; end if;
  insert into private.store_admins(user_id, approved_factor_id) values(p_user, approved_factor);
  insert into private.store_admin_access_events(user_id,factor_id,event) values(p_user,approved_factor,'activated');
end;
$$;

create function private.store_begin_admin_recovery(p_user uuid) returns void
language plpgsql volatile security invoker set search_path = '' as $$
declare previous_factor uuid;
begin
  perform 1 from auth.users where id = p_user for update;
  if not found then raise insufficient_privilege; end if;
  delete from private.store_admins where user_id = p_user returning approved_factor_id into previous_factor;
  if not found then raise insufficient_privilege; end if;
  delete from private.store_admin_enrollment where user_id = p_user;
  delete from auth.sessions where user_id = p_user;
  insert into private.store_admin_access_events(user_id,factor_id,event)
    values(p_user,previous_factor,'recovery_started');
end;
$$;
revoke all on function private.store_approve_admin(uuid,uuid), private.store_activate_admin(uuid,uuid),
  private.store_begin_admin_recovery(uuid) from public, anon, authenticated, service_role;
commit;
