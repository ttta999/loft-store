alter table private.store_customer_preferences add column language text check(language in ('ru','uz'));
create function public.store_customer_language(p_user text,p_language text default null) returns text language plpgsql set search_path='' as $$
begin
 if p_user !~ '^[1-9][0-9]{0,15}$' then raise exception 'Invalid customer';end if;
 if p_language is not null then
  if p_language not in ('ru','uz') then raise exception 'Invalid language';end if;
  -- Language is independent of versioned contact/address patches; those never overwrite this column.
  insert into private.store_customer_preferences(user_id,language,version) values(p_user,p_language,0) on conflict(user_id) do update set language=excluded.language,updated_at=clock_timestamp();
 end if;
 return(select language from private.store_customer_preferences where user_id=p_user);
end $$;
revoke all on function public.store_customer_language(text,text) from public,anon,authenticated;
grant execute on function public.store_customer_language(text,text) to service_role;

alter table public.campaigns add column content_language text not null default 'ru' check(content_language in ('ru','uz')),add column translations jsonb not null default '{}' check(jsonb_typeof(translations)='object');
-- Preserve the existing transactional validation, audience freeze, audit and queue actions.
alter function public.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) set schema private;
alter function private.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) rename to store_admin_campaign_action_base;
revoke all on function private.store_admin_campaign_action_base(text,uuid,jsonb,bigint,text,uuid) from public,anon,authenticated,service_role;
create function public.store_admin_campaign_action(p_action text,p_id uuid default null,p_value jsonb default null,p_version bigint default null,p_when text default null,p_key uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype;result jsonb;lang text;versions jsonb;entry record;body jsonb;test_id uuid;existing text;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 if p_id is not null then select * into c from public.campaigns where id=p_id for update;end if;
 if p_action='save' then
  lang:=coalesce(p_value->>'content_language',c.content_language,'ru');versions:=case when p_value ? 'translations' then p_value->'translations' else coalesce(c.translations,'{}'::jsonb) end;
  if lang not in ('ru','uz') or jsonb_typeof(versions) is distinct from 'object' or exists(select 1 from jsonb_object_keys(versions) k where k not in ('ru','uz') or k=lang) then raise exception 'Проверьте языковые версии сообщения';end if;
  for entry in select * from jsonb_each(versions) loop
   body:=entry.value;
   if jsonb_typeof(body) is distinct from 'object' or length(btrim(coalesce(body->>'title',''))) not between 1 and 200 or length(btrim(coalesce(body->>'message',''))) not between 1 and 3800 or length(btrim(coalesce(body->>'button_label',''))) not between 1 and 64 then raise exception 'Заполните заголовок, текст и кнопку дополнительной версии';end if;
   if length(body->>'title')+length(body->>'message')+4>(case when nullif(p_value->>'image_ref','') is null then 4096 else 1024 end) then raise exception 'Дополнительная версия превышает ограничение Telegram';end if;
  end loop;
 end if;
 if p_action='test' then
  lang:=coalesce(p_value->>'test_language',c.content_language,'ru');if lang not in ('ru','uz') then raise exception 'Выберите язык тестового сообщения';end if;
  select snapshot->>'test_language' into existing from private.store_campaign_tests where request_key=p_key;
  if existing is not null and existing<>lang then raise exception 'Ключ теста уже использован для другого языка';end if;
 end if;
 result:=private.store_admin_campaign_action_base(p_action,p_id,p_value,p_version,p_when,p_key);
 if p_action='save' then
  update public.campaigns set content_language=lang,translations=versions where id=(result->>'id')::uuid;
 elsif p_action='copy' then
  update public.campaigns set content_language=c.content_language,translations=c.translations where id=(result->>'id')::uuid;
 elsif p_action='test' then
  test_id:=(result->>'id')::uuid;update private.store_campaign_tests set snapshot=snapshot||jsonb_build_object('test_language',lang) where id=test_id and not(snapshot ? 'test_language');return result;
 else return result;
 end if;
 insert into private.store_admin_action_audit(manager_id,action,entity_id,after_value) values(auth.uid(),'campaign_languages',result->>'id',jsonb_build_object('content_language',lang,'languages',coalesce(versions,'{}')));
 return(select to_jsonb(saved) from public.campaigns saved where id=(result->>'id')::uuid);
end $$;
revoke all on function public.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) from public,anon;
grant execute on function public.store_admin_campaign_action(text,uuid,jsonb,bigint,text,uuid) to authenticated;

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
  return jsonb_build_object('kind','test','id',t.id,'lease',token,'language',coalesce(t.snapshot->>'test_language',t.snapshot->>'content_language','ru'),'payload',t.snapshot);
 end if;
 for c in select * from public.campaigns where status='sending' and exists(select 1 from private.store_campaign_recipients r2 where r2.campaign_id=campaigns.id and r2.status='pending' and r2.next_attempt_at<=clock_timestamp()) order by created_at limit 20 for update skip locked loop
  select * into r from private.store_campaign_recipients where campaign_id=c.id and status='pending' and next_attempt_at<=clock_timestamp() order by next_attempt_at,id limit 1 for update skip locked;
  if found then
   token:=gen_random_uuid();update private.store_campaign_recipients set status='sending',attempts=attempts+1,lease=token,lease_expires_at=clock_timestamp()+interval '2 minutes' where id=r.id;
   update private.store_campaign_throttle set next_at=clock_timestamp()+interval '400 milliseconds' where singleton;
   return jsonb_build_object('kind','campaign','id',r.id,'lease',token,'user_id',r.user_id,'language',coalesce((select language from private.store_customer_preferences where user_id=r.user_id),c.content_language),'payload',to_jsonb(c));
  end if;
 end loop;
 return null;
end $$;

create or replace function public.store_queue_restocks() returns void language plpgsql set search_path='' as $$
declare candidate record; s record;
begin
 for candidate in select c.* from private.store_restock_candidates c where c.available_after<=clock_timestamp() order by c.available_after limit 10 for update skip locked loop
  if exists(select 1 from public.store_catalog_variants() v where v.id=candidate.variant_id and v.available) then
   for s in select sub.id,sub.user_id,p.id product_id,p.name_ru,p.name_uz,v.size_value,col.name_ru color,col.name_uz color_uz from private.store_restock_subscriptions sub join public.product_variants v on v.id=sub.variant_id join public.products p on p.id=v.product_id left join public.product_colors col on col.id=v.color_id where sub.variant_id=candidate.variant_id and sub.status='active' order by sub.id limit 100 for update of sub skip locked loop
    insert into private.store_outbox(event_key,user_id,kind,payload) values('restock:'||s.id||':'||candidate.cycle,s.user_id,'custom',jsonb_build_object('restock',jsonb_build_object('subscription_id',s.id,'variant_id',candidate.variant_id,'product_id',s.product_id,'name',s.name_ru,'name_uz',s.name_uz,'color_uz',s.color_uz,'size',s.size_value,'color',s.color))) on conflict(event_key) do nothing;
    update private.store_restock_subscriptions set status='queued' where id=s.id;
   end loop;
  end if;
  if not exists(select 1 from private.store_restock_subscriptions where variant_id=candidate.variant_id and status='active') or not exists(select 1 from public.product_variants where id=candidate.variant_id and stock>0) then delete from private.store_restock_candidates where variant_id=candidate.variant_id;
  else update private.store_restock_candidates set available_after=clock_timestamp()+interval '1 hour' where variant_id=candidate.variant_id;end if;
 end loop;
end $$;
create or replace function public.store_admin_campaign_tests(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 return coalesce((select jsonb_agg(t order by t.created_at desc) from(select id,status,created_at,sent_at,last_error,coalesce(snapshot->>'test_language',snapshot->>'content_language','ru') as language from private.store_campaign_tests where campaign_id=p_id order by created_at desc limit 10)t),'[]'::jsonb);
end $$;
