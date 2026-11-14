-- Append-only server journal. No customer-facing table grants.
create table private.store_order_events(
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 order_id bigint,request_id bigint,refund_id bigint,event_type text not null,
 previous_status text,new_status text,actor_type text not null check(actor_type in ('client','manager','system','unknown')),
 actor_id text,metadata jsonb not null default '{}',created_at timestamptz not null default clock_timestamp()
);
create index store_order_events_order on private.store_order_events(order_id,event_type,created_at desc);
create index store_order_events_request on private.store_order_events(request_id,created_at);
alter table private.store_order_events enable row level security;
revoke all on private.store_order_events from public,anon,authenticated;
grant select,insert on private.store_order_events to service_role;
create table private.store_admin_action_audit(id uuid primary key default gen_random_uuid(),manager_id uuid references auth.users(id),action text not null,entity_id text,before_value jsonb,after_value jsonb,created_at timestamptz not null default clock_timestamp());
alter table private.store_admin_action_audit enable row level security;
revoke all on private.store_admin_action_audit from public,anon,authenticated;
grant select,insert on private.store_admin_action_audit to service_role;

create function private.store_journal_event(p_key text,p_order bigint,p_request bigint,p_refund bigint,p_kind text,p_previous text,p_status text,p_actor text,p_actor_id text,p_metadata jsonb) returns void language sql set search_path='' as $$
 insert into private.store_order_events(event_key,order_id,request_id,refund_id,event_type,previous_status,new_status,actor_type,actor_id,metadata)
 values(p_key,p_order,p_request,p_refund,p_kind,p_previous,p_status,p_actor,p_actor_id,p_metadata) on conflict(event_key) do nothing;
$$;
revoke all on function private.store_journal_event(text,bigint,bigint,bigint,text,text,text,text,text,jsonb) from public,anon,authenticated;
create function private.store_journal_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new);o jsonb:='{}';actor text:='system';actor_id text;oid bigint;rid bigint;fid bigint;prefix text;kind text;meta jsonb;
begin
 if tg_op='UPDATE' then o:=to_jsonb(old);end if;
 if auth.uid() is not null and public.store_is_admin() then actor:='manager';actor_id:=auth.uid()::text;
 elsif tg_table_name in ('orders','china_requests') and (tg_op='INSERT' or n->>'cancelled_by'='client' or (n->>'receipt_submitted_at' is distinct from o->>'receipt_submitted_at' and n->>'receipt_submitted_at' is not null) or (tg_table_name='china_requests' and n->>'status' in ('Отменён','Оформлен'))) then actor:='client';actor_id:=n->>'user_id';end if;
 if tg_table_name='orders' then oid:=new.id;
 elsif tg_table_name='china_requests' then rid:=new.id;
 else oid:=(n->>'order_id')::bigint;fid:=new.id;end if;
 prefix:=tg_table_name||':'||new.id||':'||txid_current()||':'||md5((o||jsonb_build_object('next',n-'payment_screenshot_url'-'delivery_address'-'client_phone'))::text);
 if tg_op='INSERT' then
  kind:=case tg_table_name when 'orders' then 'order_created' when 'china_requests' then 'request_created' else 'refund_created' end;
  perform private.store_journal_event(prefix||':create',oid,rid,fid,kind,null,n->>'status',actor,actor_id,'{}');
 else
  if n->>'status' is distinct from o->>'status' then
   kind:=case tg_table_name when 'orders' then 'status_changed' when 'china_requests' then case when n->>'status'='Оценён' then 'request_assessed' else 'request_status_changed' end else case when n->>'status'='Возврат выполнен' then 'refund_completed' else 'refund_status_changed' end end;
   meta:=jsonb_strip_nulls(jsonb_build_object('cancelled_by',n->>'cancelled_by','reason',n->>'cancellation_reason','manager_price',case when tg_table_name='china_requests' then n->'manager_price' end));
   perform private.store_journal_event(prefix||':status',oid,rid,fid,kind,o->>'status',n->>'status',actor,actor_id,meta);
  end if;
  if tg_table_name='orders' then
   if n->>'receipt_submitted_at' is distinct from o->>'receipt_submitted_at' and n->>'receipt_submitted_at' is not null then perform private.store_journal_event(prefix||':receipt',oid,null,null,'receipt_submitted',null,null,actor,actor_id,'{}');end if;
   if n->>'paid_at' is distinct from o->>'paid_at' and n->>'paid_at' is not null then perform private.store_journal_event(prefix||':paid',oid,null,null,'payment_confirmed',null,null,actor,actor_id,jsonb_build_object('amount',n->'payment_amount','currency',n->'payment_currency'));end if;
   if n->>'courier_link' is distinct from o->>'courier_link' then perform private.store_journal_event(prefix||':courier',oid,null,null,'tracking_changed',null,null,actor,actor_id,'{}');end if;
  elsif tg_table_name='china_requests' and n->>'status'=o->>'status' and n->>'manager_price' is distinct from o->>'manager_price' then
   perform private.store_journal_event(prefix||':quote',null,rid,null,'request_assessed',o->>'status',n->>'status',actor,actor_id,jsonb_build_object('manager_price',n->'manager_price'));
  elsif tg_table_name='refunds' and (n->>'amount',n->>'currency') is distinct from (o->>'amount',o->>'currency') then
   perform private.store_journal_event(prefix||':amount',oid,null,fid,'refund_payment_checked',null,null,actor,actor_id,jsonb_build_object('amount',n->'amount','currency',n->'currency'));
  end if;
 end if;
 return new;
end $$;
revoke all on function private.store_journal_changed() from public,anon,authenticated;
create trigger store_journal after insert or update on public.orders for each row execute function private.store_journal_changed();
create trigger store_journal after insert or update on public.china_requests for each row execute function private.store_journal_changed();
create trigger store_journal after insert or update on public.refunds for each row execute function private.store_journal_changed();
-- Only independently recorded historical facts, never inferred status timestamps.
insert into private.store_order_events(event_key,order_id,event_type,actor_type,metadata,created_at) select 'legacy:order-created:'||id,id,'order_created','unknown','{"legacy":true}',created_at from public.orders where created_at is not null;
insert into private.store_order_events(event_key,order_id,event_type,actor_type,metadata,created_at) select 'legacy:receipt:'||id,id,'receipt_submitted','unknown','{"legacy":true}',receipt_submitted_at from public.orders where receipt_submitted_at is not null;
insert into private.store_order_events(event_key,order_id,event_type,actor_type,metadata,created_at) select 'legacy:paid:'||id,id,'payment_confirmed','unknown','{"legacy":true}',paid_at at time zone 'UTC' from public.orders where paid_at is not null;
insert into private.store_order_events(event_key,request_id,event_type,actor_type,metadata,created_at) select 'legacy:request-created:'||id,id,'request_created','unknown','{"legacy":true}',created_at from public.china_requests where created_at is not null;
insert into private.store_order_events(event_key,order_id,refund_id,event_type,actor_type,metadata,created_at) select 'legacy:refund-created:'||id,order_id,id,'refund_created','unknown','{"legacy":true}',created_at from public.refunds where created_at is not null;
insert into private.store_order_events(event_key,order_id,refund_id,event_type,actor_type,metadata,created_at) select 'legacy:refund-completed:'||id,order_id,id,'refund_completed','unknown','{"legacy":true}',completed_at from public.refunds where completed_at is not null;
create function public.store_admin_order_history(p_id bigint) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 return coalesce((select jsonb_agg(to_jsonb(e)-'event_key' order by e.created_at,e.id) from (select * from private.store_order_events e where e.order_id=p_id or e.request_id in(select r.id from public.china_requests r where r.converted_to_order_id=p_id::text or r.id::text=(select special_order_id from public.orders where id=p_id)) order by e.created_at,e.id limit 1000)e),'[]'::jsonb);
end $$;
revoke all on function public.store_admin_order_history(bigint) from public,anon;
grant execute on function public.store_admin_order_history(bigint) to authenticated;

create table private.store_reminder_settings(singleton boolean primary key default true check(singleton),value jsonb not null,version bigint not null default 1);
alter table private.store_reminder_settings enable row level security;
revoke all on private.store_reminder_settings from public,anon,authenticated;
grant all on private.store_reminder_settings to service_role;
-- Activation is explicit: deployment must not suddenly message old operational records.
insert into private.store_reminder_settings(value) values('{"timezone":"Asia/Tashkent","work_start":"10:00","work_end":"20:00","repeat_hours":24,"rules":{"payment_review":{"hours":2,"enabled":false,"telegram":false},"special_assessment":{"hours":24,"enabled":false,"telegram":false},"supplier_purchase":{"hours":24,"enabled":false,"telegram":false},"assembly":{"hours":24,"enabled":false,"telegram":false},"pickup_ready":{"hours":72,"enabled":false,"telegram":false},"refund":{"hours":24,"enabled":false,"telegram":false}}}');
create function public.store_admin_reminder_settings(p_value jsonb default null,p_version bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare oldrow private.store_reminder_settings%rowtype;rule jsonb;kind text;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 select * into oldrow from private.store_reminder_settings where singleton for update;
 if p_value is not null then
  if p_version is distinct from oldrow.version then raise exception 'Настройки изменились. Обновите страницу';end if;
  if jsonb_typeof(p_value) is distinct from 'object' or not exists(select 1 from pg_timezone_names where name=p_value->>'timezone') or coalesce(p_value->>'work_start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_value->>'work_end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_value->>'work_start'=p_value->>'work_end' or coalesce(p_value->>'repeat_hours','') !~ '^[0-9]{1,4}$' or (p_value->>'repeat_hours')::int not between 24 and 8760 then raise exception 'Проверьте часовой пояс и рабочие часы';end if;
  foreach kind in array array['payment_review','special_assessment','supplier_purchase','assembly','pickup_ready','refund'] loop
   rule:=p_value#>array['rules',kind];
   if jsonb_typeof(rule) is distinct from 'object' or jsonb_typeof(rule->'enabled') is distinct from 'boolean' or jsonb_typeof(rule->'telegram') is distinct from 'boolean' or coalesce(rule->>'hours','') !~ '^[0-9]{1,4}$' or (rule->>'hours')::int not between 1 and 8760 then raise exception 'Проверьте сроки напоминаний';end if;
  end loop;
  update private.store_reminder_settings set value=p_value,version=version+1 where singleton;
  insert into private.store_admin_action_audit(manager_id,action,before_value,after_value) values(auth.uid(),'reminder_settings',oldrow.value,p_value);
  insert into public.store_data_revisions(topic) values('reminder_settings') on conflict(topic) do update set revision=public.store_data_revisions.revision+1,changed_at=clock_timestamp();
 end if;
 return(select jsonb_build_object('value',value,'version',version) from private.store_reminder_settings where singleton);
end $$;
revoke all on function public.store_admin_reminder_settings(jsonb,bigint) from public,anon;
grant execute on function public.store_admin_reminder_settings(jsonb,bigint) to authenticated;

create function private.store_tasks() returns table(kind text,entity_id bigint,order_id bigint,request_id bigint,started_at timestamptz,source_status text,client_name text)
language sql stable set search_path='' as $$
 select 'payment_review',o.id,o.id,null::bigint,o.receipt_submitted_at,o.status,o.client_name from public.orders o where o.checkout_abandoned_at is null and o.status<>'Отменён' and o.payment_method='online_card' and o.receipt_submitted_at is not null and o.payment_status='pending' and o.paid_at is null
 union all select 'special_assessment',r.id,null,r.id,r.created_at,r.status,(select s.first_name from public.subscribers s where s.user_id=r.user_id limit 1) from public.china_requests r where r.status='На оценке'
 union all select 'supplier_purchase',o.id,o.id,null,o.paid_at at time zone 'UTC',o.status,o.client_name from public.orders o where o.special_fulfillment and o.status='Принят' and o.payment_status='paid' and o.paid_at is not null and o.checkout_abandoned_at is null
 union all select 'assembly',o.id,o.id,null,(select max(e.created_at) from private.store_order_events e where e.order_id=o.id and e.event_type='status_changed' and e.new_status=o.status),o.status,o.client_name from public.orders o where o.checkout_abandoned_at is null and ((not o.special_fulfillment and o.status in ('Активный','В обработке')) or (o.special_fulfillment and o.status='Собирается')) and (o.payment_method<>'online_card' or (o.payment_status='paid' and o.paid_at is not null))
 union all select 'pickup_ready',o.id,o.id,null,(select max(e.created_at) from private.store_order_events e where e.order_id=o.id and e.event_type='status_changed' and e.new_status=o.status),o.status,o.client_name from public.orders o where o.delivery_method='pickup' and ((not o.special_fulfillment and o.status='Готов') or (o.special_fulfillment and o.status='Готов к выдаче')) and o.checkout_abandoned_at is null
 union all select 'refund',r.id,r.order_id,null,(select max(e.created_at) from private.store_order_events e where e.refund_id=r.id and e.event_type in ('refund_created','refund_status_changed') and e.new_status=r.status),r.status,o.client_name from public.refunds r join public.orders o on o.id=r.order_id where r.status in ('Проверка платежа','Ожидает возврата');
$$;
revoke all on function private.store_tasks() from public,anon,authenticated;
create function private.store_task_details() returns table(kind text,entity_id bigint,order_id bigint,request_id bigint,started_at timestamptz,source_status text,client_name text,due_at timestamptz,overdue boolean,enabled boolean,telegram boolean,hours integer)
language sql stable set search_path='' as $$
 select t.*,t.started_at+make_interval(hours=>(s.value#>>array['rules',t.kind,'hours'])::int),t.started_at+make_interval(hours=>(s.value#>>array['rules',t.kind,'hours'])::int)<now(),(s.value#>>array['rules',t.kind,'enabled'])::boolean,(s.value#>>array['rules',t.kind,'telegram'])::boolean,(s.value#>>array['rules',t.kind,'hours'])::int from private.store_tasks() t cross join private.store_reminder_settings s;
$$;
revoke all on function private.store_task_details() from public,anon,authenticated;
create function public.store_admin_tasks() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 return jsonb_build_object('counts',coalesce((select jsonb_object_agg(kind,n) from(select kind,count(*) n from private.store_task_details() group by kind)c),'{}'::jsonb),'tasks',coalesce((select jsonb_agg(to_jsonb(t)-'client_name'-'telegram'-'enabled' order by t.due_at nulls last) from(select * from private.store_task_details() order by due_at nulls last,kind,entity_id limit 100)t),'[]'::jsonb),'timezone',(select value->>'timezone' from private.store_reminder_settings));
end $$;
revoke all on function public.store_admin_tasks() from public,anon;
grant execute on function public.store_admin_tasks() to authenticated;
create function private.store_within_work_hours() returns boolean language sql stable set search_path='' as $$
 select case when (value->>'work_start')::time<(value->>'work_end')::time then (now() at time zone (value->>'timezone'))::time>=(value->>'work_start')::time and (now() at time zone (value->>'timezone'))::time<(value->>'work_end')::time else (now() at time zone (value->>'timezone'))::time>=(value->>'work_start')::time or (now() at time zone (value->>'timezone'))::time<(value->>'work_end')::time end from private.store_reminder_settings;
$$;
revoke all on function private.store_within_work_hours() from public,anon,authenticated;
create function public.store_queue_manager_reminders() returns void language plpgsql set search_path='' as $$
declare task record;settings jsonb;key text;
begin
 perform pg_advisory_xact_lock(hashtextextended('store-manager-reminders',0));
 if not private.store_within_work_hours() then return;end if;
 select value into settings from private.store_reminder_settings;
 for task in select * from private.store_task_details() where enabled and telegram and overdue and (kind<>'assembly' or source_status in ('В обработке','Собирается')) order by due_at limit 50 loop
  if not exists(select 1 from private.store_outbox e where e.payload#>>'{manager_reminder,kind}'=task.kind and e.payload#>>'{manager_reminder,entity_id}'=task.entity_id::text and (e.payload#>>'{manager_reminder,started_at}')::timestamptz=task.started_at and (e.sent_at is null or e.sent_at>now()-make_interval(hours=>(settings->>'repeat_hours')::int))) then
   key:='manager-reminder:'||task.kind||':'||task.entity_id||':'||task.started_at::text||':'||to_char(now() at time zone (settings->>'timezone'),'YYYY-MM-DD');
   insert into private.store_outbox(event_key,user_id,kind,payload) values(key,'manager','custom',jsonb_build_object('recipient','manager','manager_reminder',to_jsonb(task))) on conflict(event_key) do nothing;
  end if;
 end loop;
end $$;
revoke all on function public.store_queue_manager_reminders() from public,anon,authenticated;
grant execute on function public.store_queue_manager_reminders() to service_role;
create function public.store_reminder_ready(p_event bigint) returns text language plpgsql stable set search_path='' as $$
declare payload jsonb;task record;
begin
 select e.payload->'manager_reminder' into payload from private.store_outbox e where e.id=p_event and e.sent_at is null;
 if payload is null then return 'obsolete';end if;
 select * into task from private.store_task_details() t where t.kind=payload->>'kind' and t.entity_id=(payload->>'entity_id')::bigint and t.started_at=(payload->>'started_at')::timestamptz;
 if not found or not task.enabled or not task.telegram then return 'obsolete';end if;
 if not coalesce(task.overdue,false) or not private.store_within_work_hours() then return 'defer';end if;
 return 'ready';
end $$;
revoke all on function public.store_reminder_ready(bigint) from public,anon,authenticated;
grant execute on function public.store_reminder_ready(bigint) to service_role;

CREATE OR REPLACE FUNCTION public.store_pending_notifications()
 RETURNS SETOF private.store_outbox
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select e.* from private.store_outbox e where e.sent_at is null
 and (e.claimed_at is null or e.claimed_at<now()-make_interval(secs=>least(3600,greatest(60,e.attempts*60))))
 and (e.kind not in ('order','order_client') or exists(select 1 from public.orders o where o.id=e.order_id and o.user_id=e.user_id and o.checkout_abandoned_at is null and o.status<>'Отменён' and (o.payment_method<>'online_card' or o.receipt_submitted_at is not null or o.payment_status='paid')))
 and (e.payload->'special_request' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_request,id}'=e.payload#>>'{special_request,id}'))
 and (e.payload->'special_order' is null or not exists(select 1 from private.store_outbox prior where prior.id<e.id and prior.sent_at is null and prior.payload#>>'{special_order,id}'=e.payload#>>'{special_order,id}'))
 and (e.order_id is null or coalesce(e.payload->>'recipient','client')='manager' or not(e.payload ?| array['ordinary_order','cancellation','refund','special_order']) or not exists(
 select 1 from private.store_outbox prior where prior.order_id=e.order_id and prior.user_id=e.user_id and prior.id<e.id and prior.sent_at is null
 and coalesce(prior.payload->>'recipient','client')<>'manager' and prior.payload ?| array['ordinary_order','cancellation','refund','special_order']))
 order by case when e.payload ? 'restock' then 2 when e.payload ? 'manager_reminder' then 1 else 0 end,e.id limit 10;
$function$;

