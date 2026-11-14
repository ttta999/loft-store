-- Finished cancelled campaigns must not occupy the bounded due-work scan.
create or replace function public.store_campaign_claim() returns jsonb language plpgsql set search_path='' as $$
declare c public.campaigns%rowtype;r private.store_campaign_recipients%rowtype;t private.store_campaign_tests%rowtype;token uuid;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('store-campaign-claim',0)) then return null;end if;
 -- A process that disappeared after claiming may already have sent. Never replay it automatically.
 for c in select * from public.campaigns where (status='scheduled' and scheduled_at<=clock_timestamp()) or (status in ('sending','cancelled') and exists(select 1 from private.store_campaign_recipients work where work.campaign_id=campaigns.id and ((work.status='sending' and work.lease_expires_at<clock_timestamp()) or (campaigns.status='sending' and work.status='pending' and work.next_attempt_at<=clock_timestamp())))) order by (status='scheduled') desc,created_at limit 20 for update skip locked loop
  if c.status='scheduled' then update public.campaigns set status='sending',started_at=clock_timestamp(),updated_at=clock_timestamp() where id=c.id;end if;
  update private.store_campaign_recipients set status='uncertain',last_error='Обработчик завершился без подтверждения результата' where campaign_id=c.id and status='sending' and lease_expires_at<clock_timestamp();
  update private.store_campaign_recipients r2 set status='skipped',last_error='Согласие отозвано или чат недоступен' where r2.campaign_id=c.id and r2.status='pending' and (not exists(select 1 from private.store_customer_preferences p where p.user_id=r2.user_id and p.marketing_enabled) or exists(select 1 from private.store_bot_delivery_state b where b.user_id=r2.user_id and b.blocked));
  if not private.store_campaign_target(c.target_type,c.target_id) then update private.store_campaign_recipients set status='skipped',last_error='Целевая страница недоступна' where campaign_id=c.id and status='pending';end if;
  perform private.store_campaign_recount(c.id);
 end loop;
 update private.store_campaign_tests set status='uncertain',last_error='Обработчик завершился без подтверждения результата' where status='sending' and lease_expires_at<clock_timestamp();
 if exists(select 1 from public.store_pending_notifications()) then return null;end if;
 if (select next_at>clock_timestamp() from private.store_campaign_throttle where singleton) then return null;end if;
 select * into t from private.store_campaign_tests where status='pending' order by created_at limit 1 for update skip locked;
 if found then
  token:=gen_random_uuid();update private.store_campaign_tests set status='sending',lease=token,lease_expires_at=clock_timestamp()+interval '2 minutes' where id=t.id;
  update private.store_campaign_throttle set next_at=clock_timestamp()+interval '400 milliseconds' where singleton;
  return jsonb_build_object('kind','test','id',t.id,'lease',token,'payload',t.snapshot);
 end if;
 for c in select * from public.campaigns where status='sending' and exists(select 1 from private.store_campaign_recipients r2 where r2.campaign_id=campaigns.id and r2.status='pending' and r2.next_attempt_at<=clock_timestamp()) order by created_at limit 20 for update skip locked loop
  select * into r from private.store_campaign_recipients where campaign_id=c.id and status='pending' and next_attempt_at<=clock_timestamp() order by next_attempt_at,id limit 1 for update skip locked;
  if found then
   token:=gen_random_uuid();update private.store_campaign_recipients set status='sending',attempts=attempts+1,lease=token,lease_expires_at=clock_timestamp()+interval '2 minutes' where id=r.id;
   update private.store_campaign_throttle set next_at=clock_timestamp()+interval '400 milliseconds' where singleton;
   return jsonb_build_object('kind','campaign','id',r.id,'lease',token,'user_id',r.user_id,'payload',to_jsonb(c));
  end if;
 end loop;
 return null;
end $$;
