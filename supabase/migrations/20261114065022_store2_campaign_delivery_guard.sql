-- Bot opt-out after audience freeze must also stop advertising before the actual send.
create or replace function public.store_campaign_preflight(p_kind text,p_id uuid,p_lease uuid) returns boolean language plpgsql stable set search_path='' as $$
declare r private.store_campaign_recipients%rowtype;t private.store_campaign_tests%rowtype;c public.campaigns%rowtype;
begin
 if p_kind='test' then
  select * into t from private.store_campaign_tests where id=p_id and lease=p_lease and status='sending' and lease_expires_at>clock_timestamp();
  return found and exists(select 1 from public.campaigns where id=t.campaign_id and status<>'cancelled') and private.store_campaign_target(t.snapshot->>'target_type',t.snapshot->>'target_id');
 end if;
 if p_kind<>'campaign' then return false;end if;
 select * into r from private.store_campaign_recipients where id=p_id and lease=p_lease and status='sending' and lease_expires_at>clock_timestamp();if not found then return false;end if;
 select * into c from public.campaigns where id=r.campaign_id;
 return c.status='sending' and exists(select 1 from public.subscribers s where s.user_id=r.user_id and s.is_subscribed) and exists(select 1 from private.store_customer_preferences where user_id=r.user_id and marketing_enabled) and not exists(select 1 from private.store_bot_delivery_state where user_id=r.user_id and blocked) and private.store_campaign_target(c.target_type,c.target_id);
end $$;
