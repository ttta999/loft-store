-- Actual successful reminder delivery, distinct from simply closing an obsolete queue event.
create table private.store_reminder_deliveries(event_id bigint primary key references private.store_outbox(id),kind text not null,entity_id bigint not null,started_at timestamptz not null,sent_at timestamptz not null default clock_timestamp());
create index store_reminder_deliveries_stage on private.store_reminder_deliveries(kind,entity_id,started_at,sent_at desc);
alter table private.store_reminder_deliveries enable row level security;
revoke all on private.store_reminder_deliveries from public,anon,authenticated;
grant select,insert on private.store_reminder_deliveries to service_role;
create function public.store_reminder_delivered(p_event bigint) returns void language sql set search_path='' as $$
 insert into private.store_reminder_deliveries(event_id,kind,entity_id,started_at)
 select id,payload#>>'{manager_reminder,kind}',(payload#>>'{manager_reminder,entity_id}')::bigint,(payload#>>'{manager_reminder,started_at}')::timestamptz from private.store_outbox where id=p_event and payload ? 'manager_reminder'
 on conflict(event_id) do nothing;
$$;
revoke all on function public.store_reminder_delivered(bigint) from public,anon,authenticated;
grant execute on function public.store_reminder_delivered(bigint) to service_role;
create or replace function public.store_admin_reminder_settings(p_value jsonb default null,p_version bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare oldrow private.store_reminder_settings%rowtype;rule jsonb;kind text;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 select * into oldrow from private.store_reminder_settings where singleton for update;
 if p_value is not null then
  if p_version is distinct from oldrow.version then raise exception using message='Настройки были изменены другим менеджером. Обновите данные',errcode='40001';end if;
  if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'Проверьте настройки напоминаний';end if;
  if exists(select 1 from jsonb_object_keys(p_value) k where k not in ('timezone','work_start','work_end','repeat_hours','rules')) then raise exception 'Неизвестная настройка напоминаний';end if;
  p_value:=oldrow.value||p_value||jsonb_build_object('rules',coalesce(oldrow.value->'rules','{}'::jsonb)||coalesce(p_value->'rules','{}'::jsonb));
  if not exists(select 1 from pg_timezone_names where name=p_value->>'timezone') then raise exception 'Укажите действительный часовой пояс';end if;
  if coalesce(p_value->>'work_start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_value->>'work_end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Укажите время в формате HH:mm';end if;
  if p_value->>'work_start'=p_value->>'work_end' then raise exception 'Время начала и окончания рабочего дня не должно совпадать';end if;
  if coalesce(p_value->>'repeat_hours','') !~ '^[0-9]{1,4}$' then raise exception 'Укажите корректное количество часов';end if;
  if (p_value->>'repeat_hours')::int not between 1 and 8760 then raise exception 'Интервал повторения должен быть от 1 до 8760 часов';end if;
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

create or replace function public.store_queue_manager_reminders() returns void language plpgsql set search_path='' as $$
declare task record;settings jsonb;key text;last_send timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('store-manager-reminders',0));
 if not private.store_within_work_hours() then return;end if;
 select value into settings from private.store_reminder_settings;
 for task in select * from private.store_task_details() where enabled and telegram and overdue and (kind<>'assembly' or source_status in ('В обработке','Собирается')) order by due_at limit 50 loop
  select max(sent_at) into last_send from (
   select d.sent_at from private.store_reminder_deliveries d where d.kind=task.kind and d.entity_id=task.entity_id and d.started_at=task.started_at
   union all
   -- Conservatively respect pre-upgrade completed events; do not mass-replay them after changing settings.
   select e.sent_at from private.store_outbox e where e.payload#>>'{manager_reminder,kind}'=task.kind and e.payload#>>'{manager_reminder,entity_id}'=task.entity_id::text and (e.payload#>>'{manager_reminder,started_at}')::timestamptz=task.started_at and e.sent_at is not null and e.event_key not like 'manager-reminder:v2:%'
  ) history;
  if (last_send is null or last_send<=clock_timestamp()-make_interval(hours=>(settings->>'repeat_hours')::int)) and not exists(select 1 from private.store_outbox e where e.payload#>>'{manager_reminder,kind}'=task.kind and e.payload#>>'{manager_reminder,entity_id}'=task.entity_id::text and (e.payload#>>'{manager_reminder,started_at}')::timestamptz=task.started_at and e.sent_at is null) then
   key:='manager-reminder:v2:'||task.kind||':'||task.entity_id||':'||md5(task.started_at::text)||':'||coalesce(last_send::text,'first');
   insert into private.store_outbox(event_key,user_id,kind,payload) values(key,'manager','custom',jsonb_build_object('recipient','manager','manager_reminder',to_jsonb(task))) on conflict(event_key) do nothing;
  end if;
 end loop;
end $$;
create or replace function public.store_reminder_ready(p_event bigint) returns text language plpgsql stable set search_path='' as $$
declare payload jsonb;task record;
begin
 select e.payload->'manager_reminder' into payload from private.store_outbox e where e.id=p_event and e.sent_at is null;
 if exists(select 1 from private.store_reminder_deliveries where event_id=p_event) then return 'obsolete';end if;
 if payload is null then return 'obsolete';end if;
 select * into task from private.store_task_details() t where t.kind=payload->>'kind' and t.entity_id=(payload->>'entity_id')::bigint and t.started_at=(payload->>'started_at')::timestamptz;
 if not found or not task.enabled or not task.telegram then return 'obsolete';end if;
 if not coalesce(task.overdue,false) or not private.store_within_work_hours() then return 'defer';end if;
 return 'ready';
end $$;
