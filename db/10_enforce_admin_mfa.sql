-- Activate ONLY after the MFA enrollment/challenge form has deployed.
create or replace function public.store_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.store_admins a
    join auth.sessions s on s.user_id=a.user_id and s.id::text=(select auth.jwt())->>'session_id'
    where a.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now())
      and (not a.mfa_required or (
        (select auth.jwt())->>'aal'='aal2' and s.aal='aal2'
        and exists(select 1 from auth.mfa_factors f where f.user_id=a.user_id and f.status='verified')
      )));
$$;
revoke all on function public.store_is_admin() from public,anon;
grant execute on function public.store_is_admin() to authenticated;
update private.store_admins set mfa_required=true;
