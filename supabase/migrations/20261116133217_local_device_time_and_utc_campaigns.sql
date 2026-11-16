-- Display timezone belongs to the device. Only store working hours use Uzbekistan time.
-- Historical timestamps and all existing campaign schedules are deliberately untouched.
do $$
begin
 if exists(select 1 from private.store_reminder_settings where value->>'timezone' is distinct from 'Asia/Tashkent') then
  update private.store_reminder_settings set value=jsonb_set(value,'{timezone}','"Asia/Tashkent"'::jsonb),version=version+1;
  insert into public.store_data_revisions(topic) values('reminder_settings') on conflict(topic) do update set revision=public.store_data_revisions.revision+1,changed_at=clock_timestamp();
 end if;
end $$;
create or replace function public.store_admin_reminder_settings(p_value jsonb default null,p_version bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare oldrow private.store_reminder_settings%rowtype;rule jsonb;kind text;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 select * into oldrow from private.store_reminder_settings where singleton for update;
 if p_value is not null then
  if p_version is distinct from oldrow.version then raise exception using message='Настройки были изменены другим менеджером. Обновите данные',errcode='40001';end if;
  if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'Проверьте настройки напоминаний';end if;
  if exists(select 1 from jsonb_object_keys(p_value) k where k not in ('timezone','work_start','work_end','repeat_hours','rules')) then raise exception 'Неизвестная настройка напоминаний';end if;
  if p_value ? 'timezone' and p_value->>'timezone' is distinct from 'Asia/Tashkent' then raise exception 'Рабочие часы используются по времени Узбекистана';end if;
  p_value:=(oldrow.value||jsonb_build_object('timezone','Asia/Tashkent'))||p_value||jsonb_build_object('rules',coalesce(oldrow.value->'rules','{}'::jsonb)||coalesce(p_value->'rules','{}'::jsonb));
  if p_value->>'timezone' is distinct from 'Asia/Tashkent' then raise exception 'Рабочие часы используются по времени Узбекистана';end if;
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

create or replace function private.store_within_work_hours() returns boolean language sql stable set search_path='' as $$
 select case when (value->>'work_start')::time<(value->>'work_end')::time then (now() at time zone 'Asia/Tashkent')::time>=(value->>'work_start')::time and (now() at time zone 'Asia/Tashkent')::time<(value->>'work_end')::time else (now() at time zone 'Asia/Tashkent')::time>=(value->>'work_start')::time or (now() at time zone 'Asia/Tashkent')::time<(value->>'work_end')::time end from private.store_reminder_settings;
$$;
revoke all on function private.store_within_work_hours() from public,anon,authenticated;

-- Keep the existing role/MFA, version, audience freeze, audit and delivery flow.
create or replace function private.store_admin_campaign_action_base(p_action text,p_id uuid default null,p_value jsonb default null,p_version bigint default null,p_when text default null,p_key uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype;before_value jsonb;result uuid;photo text;brand uuid;moment timestamptz;matched integer;available integer;testrow private.store_campaign_tests%rowtype;
begin
 if not public.store_is_admin() then raise insufficient_privilege;end if;
 if p_id is not null then select * into c from public.campaigns where id=p_id for update;if not found then raise exception 'Рассылка недоступна';end if;end if;
 before_value:=case when c.id is not null then to_jsonb(c) end;
 if p_action='save' then
  if c.id is not null and (c.status<>'draft' or p_version is distinct from c.version) then raise exception 'Рассылка изменилась или уже запущена';end if;
  if jsonb_typeof(p_value) is distinct from 'object' or length(btrim(coalesce(p_value->>'name',''))) not between 1 and 120 or length(btrim(coalesce(p_value->>'title',''))) not between 1 and 200 or length(btrim(coalesce(p_value->>'message',''))) not between 1 and 3800 or length(btrim(coalesce(p_value->>'button_label',''))) not between 1 and 64 or coalesce(p_value->>'audience_type','') not in ('all','buyers','brand') then raise exception 'Проверьте название, текст и аудиторию';end if;
  photo:=nullif(p_value->>'image_ref','');
  if photo is not null and (photo !~ '^private:campaign-media/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' or not exists(select 1 from storage.objects where bucket_id='campaign-media' and name=substr(photo,length('private:campaign-media/')+1))) then raise exception 'Загрузите фотографию в хранилище рассылок';end if;
  if length(p_value->>'title')+length(p_value->>'message')+4>(case when photo is null then 4096 else 1024 end) then raise exception 'Текст превышает ограничение Telegram для выбранного типа сообщения';end if;
  if not private.store_campaign_target(p_value->>'target_type',nullif(p_value->>'target_id','')) then raise exception 'Целевая страница недоступна';end if;
  if p_value->>'audience_type'='brand' then
   if coalesce(p_value->>'audience_brand_id','') !~ '^[a-fA-F0-9-]{36}$' then raise exception 'Выберите бренд аудитории';end if;
   brand:=(p_value->>'audience_brand_id')::uuid;
   if not exists(select 1 from public.brands where id=brand and is_active) then raise exception 'Бренд аудитории недоступен';end if;
  end if;
  if c.id is null then
   insert into public.campaigns(name,title,message,image_ref,button_label,target_type,target_id,audience_type,audience_brand_id,created_by) values(btrim(p_value->>'name'),btrim(p_value->>'title'),btrim(p_value->>'message'),photo,btrim(p_value->>'button_label'),p_value->>'target_type',nullif(p_value->>'target_id',''),p_value->>'audience_type',brand,auth.uid()) returning id into result;
  else
   update public.campaigns set name=btrim(p_value->>'name'),title=btrim(p_value->>'title'),message=btrim(p_value->>'message'),image_ref=photo,button_label=btrim(p_value->>'button_label'),target_type=p_value->>'target_type',target_id=nullif(p_value->>'target_id',''),audience_type=p_value->>'audience_type',audience_brand_id=brand,version=version+1,updated_at=clock_timestamp() where id=c.id returning id into result;
  end if;
 elsif p_action='copy' then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  insert into public.campaigns(name,title,message,image_ref,button_label,target_type,target_id,audience_type,audience_brand_id,created_by) values(left(c.name||' — копия',120),c.title,c.message,c.image_ref,c.button_label,c.target_type,c.target_id,c.audience_type,c.audience_brand_id,auth.uid()) returning id into result;
 elsif p_action in ('start','schedule') then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  if c.status<>'draft' then return to_jsonb(c);end if;
  if p_version is distinct from c.version then raise exception 'Рассылка изменилась. Проверьте предпросмотр';end if;
  select count(*),count(*) filter(where can_send) into matched,available from private.store_campaign_audience(c.audience_type,c.audience_brand_id);
  if matched=0 or available=0 then raise exception 'Нет получателей, доступных для отправки';end if;
  if matched>50000 then raise exception 'Аудитория превышает размер одного запуска';end if;
  if jsonb_typeof(p_value->'confirmed_count') is distinct from 'number' or (p_value->>'confirmed_count')::numeric<>matched or jsonb_typeof(p_value->'confirmed_available') is distinct from 'number' or (p_value->>'confirmed_available')::numeric<>available then raise exception 'Количество получателей изменилось. Пересчитайте аудиторию';end if;
  if p_action='schedule' then
   if coalesce(p_when,'') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$' then
    moment:=p_when::timestamptz;
   elsif coalesce(p_when,'') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then
    -- Compatibility for previously deployed clients only. New clients always send UTC with Z.
    moment:=p_when::timestamp at time zone 'Asia/Tashkent';
   else raise exception 'Укажите дату и время';end if;
   if moment<=clock_timestamp() then raise exception 'Выберите будущее время';end if;
  end if;
  perform private.store_campaign_freeze(c.id,moment);result:=c.id;perform private.store_wake_campaigns();
 elsif p_action='cancel' then
  if c.id is null then raise exception 'Рассылка недоступна';end if;
  if c.status in ('completed','completed_errors','cancelled') then return to_jsonb(c);end if;
  update public.campaigns set status='cancelled',version=version+1,updated_at=clock_timestamp(),completed_at=clock_timestamp() where id=c.id;
  update private.store_campaign_recipients set status='skipped',last_error='Рассылка остановлена' where campaign_id=c.id and status='pending';
  update private.store_campaign_tests set status='skipped',last_error='Рассылка остановлена' where campaign_id=c.id and status='pending';
  perform private.store_campaign_recount(c.id);result:=c.id;
 elsif p_action='test' then
  if c.id is null or p_key is null or p_version is distinct from c.version then raise exception 'Сохраните черновик перед тестом';end if;
  select * into testrow from private.store_campaign_tests where request_key=p_key;
  if found then if testrow.campaign_id<>c.id or testrow.actor<>auth.uid() then raise exception 'Ключ теста уже использован';end if;return jsonb_build_object('id',testrow.id,'status',testrow.status);end if;
  if (select count(*) from private.store_campaign_tests where actor=auth.uid() and created_at>now()-interval '1 minute')>=3 then raise exception 'Повторите тестовую отправку через минуту';end if;
  insert into private.store_campaign_tests(campaign_id,actor,request_key,snapshot) values(c.id,auth.uid(),p_key,to_jsonb(c)) returning * into testrow;
  insert into private.store_admin_action_audit(manager_id,action,entity_id,after_value) values(auth.uid(),'campaign_test',c.id::text,jsonb_build_object('test_id',testrow.id));
  perform private.store_wake_campaigns();return jsonb_build_object('id',testrow.id,'status',testrow.status);
 else raise exception 'Неизвестное действие рассылки';end if;
 select * into c from public.campaigns where id=result;
 insert into private.store_admin_action_audit(manager_id,action,entity_id,before_value,after_value) values(auth.uid(),'campaign_'||p_action,c.id::text,before_value,to_jsonb(c));
 return to_jsonb(c);
end $$;
revoke all on function private.store_admin_campaign_action_base(text,uuid,jsonb,bigint,text,uuid) from public,anon,authenticated,service_role;
